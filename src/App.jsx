import { useEffect, useState } from "react";
import { hasSupabaseEnv, supabase } from "./lib/supabase";

const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || "554198370558";

const fallbackServices = [
  {
    id: "fallback-corte",
    slug: "corte-de-grama",
    name: "Corte de grama",
    description: "Corte uniforme, acabamento e organizacao do gramado.",
    base_price: 160,
    icon: "grass"
  },
  {
    id: "fallback-limpeza",
    slug: "limpeza-de-terreno",
    name: "Limpeza de terreno",
    description: "Remocao de mato, folhas, galhos e limpeza geral do terreno.",
    base_price: 220,
    icon: "terrain"
  },
  {
    id: "fallback-poda",
    slug: "poda-de-arvores",
    name: "Poda de arvores",
    description: "Poda cuidadosa para melhorar seguranca, visual e saude das plantas.",
    base_price: 280,
    icon: "shears"
  },
  {
    id: "fallback-manutencao",
    slug: "manutencao-de-jardim",
    name: "Manutencao de jardim",
    description: "Manutencao periodica com capricho para manter o jardim sempre bonito.",
    base_price: 190,
    icon: "leaf"
  }
];

const initialForm = {
  name: "",
  phone: "",
  address: "",
  notes: ""
};

export default function App() {
  const [activeSection, setActiveSection] = useState("home");
  const [services, setServices] = useState(fallbackServices);
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [selectedServices, setSelectedServices] = useState([]);
  const [submitState, setSubmitState] = useState({ type: "", message: "" });
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [adminSession, setAdminSession] = useState(null);
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [authState, setAuthState] = useState({ type: "", message: "" });

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (!hasSupabaseEnv) {
      return undefined;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setAdminSession(data.session ?? null);
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAdminSession(session ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!adminSession || !hasSupabaseEnv) {
      setClients([]);
      setOrders([]);
      return;
    }

    loadAdminData();
  }, [adminSession]);

  const selectedServiceObjects = services.filter((service) =>
    selectedServices.includes(service.id)
  );

  const totalSelectedPrice = selectedServiceObjects.reduce(
    (sum, item) => sum + Number(item.base_price || 0),
    0
  );

  const whatsappHref = buildWhatsAppHref({
    name: form.name,
    phone: form.phone,
    address: form.address,
    notes: form.notes,
    services: selectedServiceObjects
  });

  async function loadServices() {
    if (!hasSupabaseEnv) {
      setLoadingServices(false);
      return;
    }

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (!error && data?.length) {
      setServices(data);
    }

    setLoadingServices(false);
  }

  async function loadAdminData() {
    setLoadingAdmin(true);

    const [clientsResponse, ordersResponse] = await Promise.all([
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select(
          "id, status, notes, source, total_amount, requested_at, client:clients!orders_client_id_fkey(id, name, phone, address), order_items(id, service_name_snapshot, price_snapshot)"
        )
        .order("requested_at", { ascending: false })
    ]);

    if (!clientsResponse.error) {
      setClients(clientsResponse.data || []);
    }

    if (!ordersResponse.error) {
      setOrders(ordersResponse.data || []);
    }

    setLoadingAdmin(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedServiceObjects.length) {
      setSubmitState({
        type: "error",
        message: "Selecione pelo menos um servico antes de enviar."
      });
      return;
    }

    if (!hasSupabaseEnv || !supabase) {
      setSubmitState({
        type: "error",
        message:
          "Configure as variaveis do Supabase antes de usar em producao."
      });
      return;
    }

    setSubmitState({ type: "loading", message: "Enviando pedido..." });

    const { error } = await supabase.rpc("create_public_order", {
      customer_name: form.name.trim(),
      customer_phone: form.phone.trim(),
      customer_address: form.address.trim(),
      customer_notes: form.notes.trim(),
      selected_service_ids: selectedServiceObjects.map((item) => item.id)
    });

    if (error) {
      setSubmitState({
        type: "error",
        message: "Nao foi possivel enviar o pedido. Revise a configuracao do banco."
      });
      return;
    }

    setSubmitState({
      type: "success",
      message: "Pedido enviado com sucesso."
    });
    setForm(initialForm);
    setSelectedServices([]);

    if (adminSession) {
      loadAdminData();
    }
  }

  async function handleAdminLogin(event) {
    event.preventDefault();

    if (!hasSupabaseEnv || !supabase) {
      setAuthState({
        type: "error",
        message: "Configure o Supabase antes de usar o painel administrativo."
      });
      return;
    }

    setAuthState({ type: "loading", message: "Entrando..." });

    const { error } = await supabase.auth.signInWithPassword({
      email: authForm.email.trim(),
      password: authForm.password
    });

    if (error) {
      setAuthState({
        type: "error",
        message: "Nao foi possivel entrar. Verifique e-mail e senha."
      });
      return;
    }

    setAuthState({ type: "success", message: "Login realizado." });
  }

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuthState({ type: "", message: "" });
  }

  async function handleStatusChange(orderId, nextStatus) {
    if (!supabase) return;

    const { error } = await supabase
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", orderId);

    if (!error) {
      loadAdminData();
    }
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleService(serviceId) {
    setSelectedServices((current) =>
      current.includes(serviceId)
        ? current.filter((item) => item !== serviceId)
        : [...current, serviceId]
    );
  }

  function seedLocalPreview() {
    setForm({
      name: "Residencial Bosque Verde",
      phone: "(41) 98888-1200",
      address: "Rua das Araucarias, 1200 - Curitiba",
      notes: "Fazer acabamento das bordas e revisar canteiros."
    });
    setSelectedServices(services.slice(0, 3).map((item) => item.id));
  }

  return (
    <>
      <a
        className="floating-whatsapp"
        href={`https://wa.me/${whatsappNumber}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Chamar no WhatsApp"
      >
        <WhatsAppIcon />
        <span>WhatsApp</span>
      </a>

      <div className="garden-app">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark brand-mark-small">
              <LogoMark />
            </div>
            <div>
              <p className="eyebrow">Jardinagem Profissional</p>
              <h1>JC Jardins</h1>
            </div>
          </div>

          <nav className="sidebar-nav">
            {[
              ["home", "Inicio"],
              ["clients", "Clientes"],
              ["orders", "Painel"],
              ["invoices", "Notas"]
            ].map(([section, label]) => (
              <button
                key={section}
                className={`nav-link ${activeSection === section ? "active" : ""}`}
                onClick={() => setActiveSection(section)}
                type="button"
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="sidebar-card">
            <p className="eyebrow">Especialidade</p>
            <h3>Jardinagem com capricho e presenca profissional</h3>
            <p>
              Um jeito simples de contratar varios servicos no mesmo pedido,
              com estrutura pronta para crescer online.
            </p>
          </div>
        </aside>

        <main className="main-content">

          {activeSection === "home" && (
            <section className="section-panel active">
              <article className="hero-card">
                <div className="hero-copy">
                  <div className="hero-brand">
                    <div className="brand-mark brand-mark-hero">
                      <LogoMark />
                    </div>
                    <div>
                      <p className="eyebrow">Bem-vindo</p>
                      <h3>JC Jardins</h3>
                    </div>
                  </div>

                  <p className="hero-tagline">
                    Seu jardim bonito e bem cuidado, sem complicacao.
                  </p>
                  <p className="hero-text">
                    Contrate varios servicos em uma unica solicitacao, com
                    resumo do pedido e envio direto pelo WhatsApp.
                  </p>

                  <div className="hero-actions">
                    <button
                      className="primary-button big-button"
                      type="button"
                      onClick={() =>
                        document
                          .getElementById("request-form")
                          ?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }
                    >
                      Solicitar Servico
                    </button>
                    <a
                      className="secondary-link"
                      href={`https://wa.me/${whatsappNumber}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <WhatsAppIcon />
                      <span>WhatsApp</span>
                    </a>
                  </div>

                  <div className="hero-badges">
                    <span className="hero-badge">Atendimento em Curitiba e regiao metropolitana</span>
                    <span className="hero-badge">Varios servicos no mesmo pedido</span>
                  </div>
                </div>

                <div className="hero-visual">
                  <div className="leaf leaf-one" />
                  <div className="leaf leaf-two" />
                  <div className="leaf leaf-three" />
                  <div className="garden-card">
                    <span className="garden-chip">Pedido inteligente</span>
                    <h4>Contrate tudo em uma unica solicitacao</h4>
                    <div className="garden-mini-list">
                      <div className="garden-mini-item">
                        <div>
                          <strong>Mais praticidade</strong>
                          <small>
                            O cliente escolhe varios servicos em poucos toques.
                          </small>
                        </div>
                      </div>
                      <div className="garden-mini-item">
                        <div>
                          <strong>Resumo claro</strong>
                          <small>
                            Nome, endereco, servicos e observacoes antes de enviar.
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              <section className="section-heading compact">
                <div>
                  <p className="eyebrow">Servicos</p>
                  <h3>Escolha um ou varios servicos</h3>
                </div>
              </section>

              <div className="service-catalog">
                {loadingServices ? (
                  <div className="panel-card">Carregando servicos...</div>
                ) : (
                  services.map((service) => (
                    <article
                      className={`service-card ${
                        selectedServices.includes(service.id) ? "selected" : ""
                      }`}
                      key={service.id}
                    >
                      <div className="service-card-top">
                        <div
                          className="service-icon"
                          dangerouslySetInnerHTML={{ __html: iconMarkup(service.icon) }}
                        />
                        <span className="service-type-pill">Jardinagem</span>
                      </div>
                      <div>
                        <h4 className="service-name">{service.name}</h4>
                        <p className="muted">{service.description}</p>
                      </div>
                      <div className="service-footer">
                        <span className="price-pill">
                          {formatCurrency(service.base_price)}
                        </span>
                        <button
                          className={`secondary-button service-add-button ${
                            selectedServices.includes(service.id) ? "is-selected" : ""
                          }`}
                          type="button"
                          onClick={() => toggleService(service.id)}
                        >
                          {selectedServices.includes(service.id) ? "✔ Selecionado" : "Adicionar"}
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <section id="request-form" className="request-shell">
                <article className="request-card">
                  <div className="request-intro">
                    <div>
                      <p className="eyebrow">Solicitacao</p>
                      <h3>Monte seu pedido</h3>
                    </div>
                    <span className="live-pill">Multiplos servicos</span>
                  </div>

                  <form className="request-form" onSubmit={handleSubmit}>
                    <div className="form-grid">
                      <label>
                        Nome
                        <input
                          name="name"
                          value={form.name}
                          onChange={handleFormChange}
                          placeholder="Seu nome completo"
                          required
                        />
                      </label>
                      <label>
                        Telefone
                        <input
                          name="phone"
                          value={form.phone}
                          onChange={handleFormChange}
                          placeholder="(41) 99999-9999"
                          required
                        />
                      </label>
                      <label className="full-span">
                        Endereco
                        <input
                          name="address"
                          value={form.address}
                          onChange={handleFormChange}
                          placeholder="Rua, numero e bairro"
                          required
                        />
                      </label>
                      <label className="full-span">
                        Observacoes
                        <textarea
                          name="notes"
                          value={form.notes}
                          onChange={handleFormChange}
                          rows={4}
                          placeholder="Conte o que precisa, horario, ponto de referencia ou detalhes do local"
                        />
                      </label>
                    </div>

                    <div className="multi-service-header">
                      <div>
                        <p className="eyebrow">Selecao de servicos</p>
                        <h4>Marque um ou varios itens</h4>
                      </div>
                      <span className="selection-count">
                        {selectedServiceObjects.length} selecionado(s)
                      </span>
                    </div>

                    <div className="service-picker">
                      {services.map((service) => {
                        const selected = selectedServices.includes(service.id);
                        return (
                          <label
                            key={service.id}
                            className={`picker-card ${selected ? "selected" : ""}`}
                          >
                            <input
                              className="service-checkbox"
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleService(service.id)}
                            />
                            <div className="picker-body">
                              <div className="picker-top">
                                <div
                                  className="service-icon"
                                  dangerouslySetInnerHTML={{
                                    __html: iconMarkup(service.icon)
                                  }}
                                />
                                <span className="picker-state">
                                  {selected ? "Selecionado" : "Selecionar"}
                                </span>
                              </div>
                              <div>
                                <h4 className="picker-title">{service.name}</h4>
                                <p className="muted">{service.description}</p>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    <article className="order-summary-card">
                      <div className="panel-header">
                        <div>
                          <p className="eyebrow">Resumo do pedido</p>
                          <h4>Confira antes de finalizar</h4>
                        </div>
                        <span className="price-pill">
                          Total estimado {formatCurrency(totalSelectedPrice)}
                        </span>
                      </div>

                      <div className="summary-grid">
                        <div>
                          <span className="summary-label">Nome</span>
                          <strong>{form.name || "Nao informado"}</strong>
                        </div>
                        <div>
                          <span className="summary-label">Endereco</span>
                          <strong>{form.address || "Nao informado"}</strong>
                        </div>
                        <div className="full-span">
                          <span className="summary-label">Servicos selecionados</span>
                          <div
                            className={`summary-services ${
                              selectedServiceObjects.length ? "" : "empty-summary"
                            }`}
                          >
                            {selectedServiceObjects.length ? (
                              selectedServiceObjects.map((service) => (
                                <span className="summary-chip" key={service.id}>
                                  {service.name}
                                </span>
                              ))
                            ) : (
                              <span>
                                Selecione um ou mais servicos para montar o pedido.
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="full-span">
                          <span className="summary-label">Observacoes</span>
                          <strong>{form.notes || "Sem observacoes adicionais."}</strong>
                        </div>
                      </div>
                    </article>

                    {submitState.message && (
                      <p className={`feedback ${submitState.type}`}>
                        {submitState.message}
                      </p>
                    )}

                    <div className="request-actions">
                      <button className="primary-button giant-button" type="submit">
                        Enviar Solicitacao
                      </button>
                      <a
                        className={`whatsapp-panel-button ${
                          selectedServiceObjects.length && form.name && form.phone && form.address
                            ? ""
                            : "disabled-link"
                        }`}
                        href={whatsappHref}
                        target="_blank"
                        rel="noreferrer"
                        aria-disabled={
                          selectedServiceObjects.length && form.name && form.phone && form.address
                            ? "false"
                            : "true"
                        }
                      >
                        <WhatsAppIcon />
                        <span>Finalizar pelo WhatsApp</span>
                      </a>
                    </div>
                  </form>
                </article>

                <article className="request-card request-highlight">
                  <p className="eyebrow">Contato direto</p>
                  <h3>Atendimento claro e profissional</h3>
                  <p>
                    Quando o cliente selecionar varios servicos, o pedido ja fica
                    pronto para envio sem precisar entrar em contato varias vezes.
                  </p>
                  <div className="highlight-points">
                    <div className="highlight-item">
                      <strong>1 pedido</strong>
                      <span>varios servicos no mesmo fluxo</span>
                    </div>
                    <div className="highlight-item">
                      <strong>Resumo pronto</strong>
                      <span>mais clareza antes de enviar</span>
                    </div>
                    <div className="highlight-item">
                      <strong>WhatsApp</strong>
                      <span>mensagem pronta com todos os dados</span>
                    </div>
                  </div>
                </article>
              </section>
            </section>
          )}

          {activeSection === "clients" && (
            <section className="section-panel active">
              <AdminGate
                session={adminSession}
                authForm={authForm}
                authState={authState}
                setAuthForm={setAuthForm}
                onSubmit={handleAdminLogin}
                onLogout={handleLogout}
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Clientes</p>
                    <h3>Clientes cadastrados</h3>
                  </div>
                </div>

                {loadingAdmin ? (
                  <div className="panel-card">Carregando clientes...</div>
                ) : (
                  <div className="cards-grid">
                    {clients.length ? (
                      clients.map((client) => (
                        <article className="mini-card" key={client.id}>
                          <div className="mini-card-top">
                            <h4>{client.name}</h4>
                            <span className="tag">Cliente</span>
                          </div>
                          <p className="muted">{client.phone}</p>
                          <p className="muted">{client.address}</p>
                        </article>
                      ))
                    ) : (
                      <div className="panel-card">Nenhum cliente encontrado.</div>
                    )}
                  </div>
                )}
              </AdminGate>
            </section>
          )}

          {activeSection === "orders" && (
            <section className="section-panel active">
              <AdminGate
                session={adminSession}
                authForm={authForm}
                authState={authState}
                setAuthForm={setAuthForm}
                onSubmit={handleAdminLogin}
                onLogout={handleLogout}
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Painel</p>
                    <h3>Pedidos recebidos</h3>
                  </div>
                </div>

                <div className="stats-grid compact-stats">
                  <article className="stat-card">
                    <span>Clientes</span>
                    <strong>{clients.length}</strong>
                    <small>base cadastrada</small>
                  </article>
                  <article className="stat-card">
                    <span>Servicos</span>
                    <strong>{services.length}</strong>
                    <small>catalogo ativo</small>
                  </article>
                  <article className="stat-card">
                    <span>Ordens abertas</span>
                    <strong>
                      {orders.filter((item) => item.status !== "concluido").length}
                    </strong>
                    <small>pendentes ou em andamento</small>
                  </article>
                  <article className="stat-card accent">
                    <span>Concluidos</span>
                    <strong>
                      {orders.filter((item) => item.status === "concluido").length}
                    </strong>
                    <small>servicos finalizados</small>
                  </article>
                </div>

                {loadingAdmin ? (
                  <div className="panel-card">Carregando pedidos...</div>
                ) : (
                  <div className="list-stack">
                    {orders.length ? (
                      orders.map((order) => (
                        <article className="order-card" key={order.id}>
                          <div className="order-summary">
                            <div>
                              <p className="eyebrow order-status-label">
                                <span className={`status-chip ${statusClass(order.status)}`}>
                                  {order.status}
                                </span>
                              </p>
                              <h4>
                                {(order.order_items || []).length} servico(s) para{" "}
                                {order.client?.name || "Cliente"}
                              </h4>
                              <p className="muted">
                                {formatDate(order.requested_at)} |{" "}
                                {order.client?.phone || "Sem telefone"}
                              </p>
                              <p className="muted">{order.client?.address}</p>
                              <p className="muted">
                                {order.notes || "Sem observacoes adicionais."}
                              </p>
                              <div className="order-service-list">
                                {(order.order_items || []).map((item) => (
                                  <span className="order-service-chip" key={item.id}>
                                    {item.service_name_snapshot}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="admin-order-side">
                              <strong>{formatCurrency(order.total_amount)}</strong>
                              <select
                                value={order.status}
                                onChange={(event) =>
                                  handleStatusChange(order.id, event.target.value)
                                }
                              >
                                <option value="pendente">pendente</option>
                                <option value="em andamento">em andamento</option>
                                <option value="concluido">concluido</option>
                              </select>
                            </div>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="panel-card">Nenhum pedido recebido ainda.</div>
                    )}
                  </div>
                )}
              </AdminGate>
            </section>
          )}

          {activeSection === "invoices" && (
            <section className="section-panel active">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Fiscal</p>
                  <h3>Preparado para emissao futura</h3>
                </div>
              </div>

              <div className="panel-card">
                <p>
                  Esta base ja salva clientes, pedidos e servicos escolhidos em
                  tabelas separadas. Isso deixa o projeto pronto para acoplar
                  emissao de nota fiscal ou um modulo financeiro depois, sem
                  refazer a estrutura do sistema.
                </p>
              </div>
            </section>
          )}

          {!hasSupabaseEnv && (
            <div className="panel-card env-warning">
              O app esta em modo de estrutura local. Configure
              <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> para
              conectar o banco real.
            </div>
          )}
        </main>
      </div>
    </>
  );
}

function AdminGate({
  session,
  authForm,
  authState,
  setAuthForm,
  onSubmit,
  onLogout,
  children
}) {
  if (session) {
    return (
      <>
        <div className="admin-toolbar">
          <span className="tag">Admin conectado</span>
          <button className="secondary-button" onClick={onLogout} type="button">
            Sair
          </button>
        </div>
        {children}
      </>
    );
  }

  return (
    <div className="auth-card">
      <div>
        <p className="eyebrow">Painel interno</p>
        <h3>Entrar no administrativo</h3>
        <p className="muted">
          Use um usuario do Supabase Auth para acessar clientes e pedidos.
        </p>
      </div>

      <form className="request-form" onSubmit={onSubmit}>
        <label>
          E-mail
          <input
            type="email"
            value={authForm.email}
            onChange={(event) =>
              setAuthForm((current) => ({ ...current, email: event.target.value }))
            }
            required
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            value={authForm.password}
            onChange={(event) =>
              setAuthForm((current) => ({ ...current, password: event.target.value }))
            }
            required
          />
        </label>

        {authState.message && (
          <p className={`feedback ${authState.type}`}>{authState.message}</p>
        )}

        <button className="primary-button" type="submit">
          Entrar
        </button>
      </form>
    </div>
  );
}

function buildWhatsAppHref({ name, phone, address, notes, services }) {
  if (!services.length || !name || !phone || !address) {
    return `https://wa.me/${whatsappNumber}`;
  }

  const message = [
    "Ola, gostaria de solicitar um atendimento da JC Jardins.",
    "",
    `Nome: ${name}`,
    `Telefone: ${phone}`,
    `Endereco: ${address}`,
    `Servicos: ${services.map((item) => item.name).join(", ")}`,
    `Observacoes: ${notes || "Sem observacoes adicionais."}`
  ].join("\n");

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "Data nao informada";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(value)
  );
}

function statusClass(status) {
  return {
    pendente: "agendada",
    "em andamento": "andamento",
    concluido: "concluida"
  }[status] || "agendada";
}

function iconMarkup(icon) {
  const icons = {
    grass:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20c1.5-3 2.7-5.6 3.2-10M10 20c.7-4.2 1.7-8 3.5-12M14 20c1.6-3.8 3.7-7 6-10M3 20h18"/></svg>',
    terrain:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18c2.5-5.5 5.5-8.5 9-9 3.2-.4 5.7 1.2 9 5M3 18h18M10 8l2-3 2 3"/></svg>',
    shears:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm0 7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM8 9l11-5M8 17l11 3M13 11l6 9"/></svg>',
    leaf:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 5c-6 0-10 3.5-10 9 0 3.1 2 5 4.7 5 5.4 0 7.3-5.4 7.3-14ZM8 19c0-4.2 2.8-7.6 7-9.3"/></svg>'
  };
  return icons[icon] || icons.leaf;
}

function LogoMark() {
  return (
    <svg className="jc-logo" viewBox="0 0 92 92" aria-hidden="true">
      <circle cx="46" cy="46" r="41" />
      <path d="M34 63c-8-8-9-22 1-31 8-7 21-9 33-2-5 1-9 3.7-12 7.5C50 45 44 52 34 63Z" />
      <path d="M45 70V40" />
      <path d="M45 48c6-1 12-4 16-10" />
      <path d="M29 56c5 0 10-2 14-6" />
      <path d="M24 73h44" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19.05 4.94A9.94 9.94 0 0 0 12 2C6.48 2 2 6.48 2 12c0 1.76.46 3.48 1.33 5l-1.42 5.18 5.3-1.39A10 10 0 1 0 19.05 4.94Zm-7.05 15.3c-1.5 0-2.96-.4-4.24-1.15l-.3-.18-3.14.82.84-3.06-.2-.31A8.2 8.2 0 0 1 3.8 12c0-4.52 3.68-8.2 8.2-8.2 2.19 0 4.24.85 5.79 2.4a8.14 8.14 0 0 1 2.41 5.8c0 4.52-3.68 8.2-8.2 8.2Z" />
    </svg>
  );
}
