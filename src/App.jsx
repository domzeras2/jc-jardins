
import { useEffect, useState } from "react";
import { hasSupabaseEnv, supabase } from "./lib/supabase";

const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || "554198370558";

const fallbackServices = [
  {
    id: "fallback-corte",
    slug: "corte-de-grama",
    name: "Corte de grama",
    description: "Corte uniforme, acabamento e organização do gramado.",
    base_price: 160,
    icon: "grass",
    sort_order: 1,
    is_active: true
  },
  {
    id: "fallback-limpeza",
    slug: "limpeza-de-terreno",
    name: "Limpeza de terreno",
    description: "Remoção de mato, folhas, galhos e limpeza geral do terreno.",
    base_price: 220,
    icon: "terrain",
    sort_order: 2,
    is_active: true
  },
  {
    id: "fallback-poda",
    slug: "poda-de-arvores",
    name: "Poda de árvores",
    description: "Poda cuidadosa para melhorar a segurança, o visual e a saúde das plantas.",
    base_price: 280,
    icon: "shears",
    sort_order: 3,
    is_active: true
  },
  {
    id: "fallback-manutencao",
    slug: "manutencao-de-jardim",
    name: "Manutenção de jardim",
    description: "Manutenção periódica com capricho para manter o jardim sempre bonito.",
    base_price: 190,
    icon: "leaf",
    sort_order: 4,
    is_active: true
  }
];

const testimonials = [
  {
    name: "Mariana Lopes",
    rating: 5,
    comment:
      "Serviço muito caprichado, atendimento educado e jardim impecável no final. Passa bastante confiança."
  },
  {
    name: "Carlos Henrique",
    rating: 5,
    comment:
      "Fecharam corte de grama, poda e limpeza no mesmo atendimento. Foi prático e o resultado ficou excelente."
  },
  {
    name: "Patrícia Almeida",
    rating: 5,
    comment:
      "Gostei da organização e da pontualidade. O espaço ficou limpo, bonito e com aparência profissional."
  },
  {
    name: "Rogério Martins",
    rating: 4,
    comment:
      "Atendimento rápido, orçamento claro e execução muito bem feita. Recomendo para manutenção de jardim."
  }
];

const initialForm = {
  name: "",
  phone: "",
  address: "",
  notes: ""
};

const initialServiceForm = {
  id: "",
  name: "",
  description: "",
  base_price: "",
  icon: "leaf",
  sort_order: "",
  is_active: true
};

const initialBudgetForm = {
  name: "",
  phone: "",
  address: "",
  notes: "",
  manualTotal: ""
};

const publicSections = [{ id: "home", label: "Início" }];

const adminSections = [
  { id: "dashboard", label: "Dashboard" },
  { id: "orders", label: "Pedidos" },
  { id: "budgets", label: "Orçamentos" },
  { id: "services", label: "Serviços" },
  { id: "clients", label: "Clientes" }
];

export default function App() {
  const [activeSection, setActiveSection] = useState("home");
  const [services, setServices] = useState(fallbackServices);
  const [adminServices, setAdminServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [selectedServices, setSelectedServices] = useState([]);
  const [submitState, setSubmitState] = useState({ type: "", message: "" });
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [adminSession, setAdminSession] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [authState, setAuthState] = useState({ type: "", message: "" });
  const [serviceForm, setServiceForm] = useState(initialServiceForm);
  const [serviceState, setServiceState] = useState({ type: "", message: "" });
  const [savingService, setSavingService] = useState(false);
  const [budgetForm, setBudgetForm] = useState(initialBudgetForm);
  const [selectedBudgetServices, setSelectedBudgetServices] = useState([]);
  const [budgetState, setBudgetState] = useState({ type: "", message: "" });
  const [savingBudget, setSavingBudget] = useState(false);

  useEffect(() => {
    loadPublicServices();
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
      setAdminProfile(null);
      setClients([]);
      setOrders([]);
      setBudgets([]);
      setAdminServices([]);
      setCheckingAdmin(false);
      setLoadingAdmin(false);
      return;
    }

    verifyAdminAccess(adminSession);
  }, [adminSession]);

  const selectedServiceObjects = services.filter((service) =>
    selectedServices.includes(service.id)
  );

  const totalSelectedPrice = selectedServiceObjects.reduce(
    (sum, item) => sum + Number(item.base_price || 0),
    0
  );

  const selectedBudgetServiceObjects = adminServices.filter((service) =>
    selectedBudgetServices.includes(service.id)
  );

  const budgetSubtotal = selectedBudgetServiceObjects.reduce(
    (sum, item) => sum + Number(item.base_price || 0),
    0
  );

  const budgetFinalTotal =
    budgetForm.manualTotal !== "" ? Number(budgetForm.manualTotal || 0) : budgetSubtotal;

  const whatsappHref = buildWhatsAppHref({
    name: form.name,
    phone: form.phone,
    address: form.address,
    notes: form.notes,
    services: selectedServiceObjects
  });

  const totalRevenue = orders.reduce(
    (sum, order) => sum + Number(order.total_amount || 0),
    0
  );

  const budgetWhatsappHref = buildBudgetWhatsAppHref({
    name: budgetForm.name,
    phone: budgetForm.phone,
    address: budgetForm.address,
    notes: budgetForm.notes,
    services: selectedBudgetServiceObjects,
    totalAmount: budgetFinalTotal
  });

  const pendingOrders = orders.filter((item) => item.status === "pendente").length;
  const inProgressOrders = orders.filter(
    (item) => item.status === "em andamento"
  ).length;
  const completedOrders = orders.filter((item) => item.status === "concluido").length;

  async function loadPublicServices() {
    if (!hasSupabaseEnv) {
      setLoadingServices(false);
      return;
    }

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (!error && data?.length) {
      setServices(data);
    }

    setLoadingServices(false);
  }

  async function verifyAdminAccess(session) {
    setCheckingAdmin(true);
    setAuthState({ type: "", message: "" });

    const { data, error } = await supabase
      .from("admin_users")
      .select("id, email, full_name")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error || !data) {
      setAdminProfile(null);
      setCheckingAdmin(false);
      await supabase.auth.signOut();
      setAuthState({
        type: "error",
        message:
          "Este usuário não está autorizado no painel. Cadastre-o na tabela admin_users."
      });
      return;
    }

    setAdminProfile(data);
    setCheckingAdmin(false);
    await loadAdminData();
  }

  async function loadAdminData() {
    if (!supabase) return;

    setLoadingAdmin(true);

    const [servicesResponse, clientsResponse, ordersResponse, budgetsResponse] = await Promise.all([
      supabase
        .from("services")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("clients")
        .select(
          "id, name, phone, address, created_at, orders(id, status, requested_at, total_amount)"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select(
          "id, status, notes, source, total_amount, requested_at, client:clients!orders_client_id_fkey(id, name, phone, address), order_items(id, service_name_snapshot, price_snapshot)"
        )
        .order("requested_at", { ascending: false }),
      supabase
        .from("budgets")
        .select(
          "id, customer_name, customer_phone, customer_address, notes, status, subtotal_amount, total_amount, created_at, budget_items(id, service_name_snapshot, price_snapshot)"
        )
        .order("created_at", { ascending: false })
    ]);

    if (!servicesResponse.error) {
      setAdminServices(servicesResponse.data || []);
    }

    if (!clientsResponse.error) {
      setClients(clientsResponse.data || []);
    }

    if (!ordersResponse.error) {
      setOrders(ordersResponse.data || []);
    }

    if (!budgetsResponse.error) {
      setBudgets(budgetsResponse.data || []);
    }

    setLoadingAdmin(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedServiceObjects.length) {
      setSubmitState({
        type: "error",
        message: "Selecione pelo menos um serviço antes de enviar."
      });
      return;
    }

    if (!hasSupabaseEnv || !supabase) {
      setSubmitState({
        type: "error",
        message: "Configure as variáveis do Supabase antes de usar em produção."
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
        message: "Não foi possível enviar o pedido. Revise a configuração do banco."
      });
      return;
    }

    setSubmitState({
      type: "success",
      message: "Pedido enviado com sucesso."
    });
    setForm(initialForm);
    setSelectedServices([]);

    if (adminProfile) {
      await loadAdminData();
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email: authForm.email.trim(),
      password: authForm.password
    });

    if (error) {
      setAuthState({
        type: "error",
        message: "Não foi possível entrar. Verifique o e-mail e a senha."
      });
      return;
    }

    const { data: adminRow, error: adminError } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (adminError || !adminRow) {
      await supabase.auth.signOut();
      setAuthState({
        type: "error",
        message: "Login realizado, mas este usuário não tem permissão de administrador."
      });
      return;
    }

    setAuthState({ type: "success", message: "Login realizado." });
    setAuthForm({ email: "", password: "" });
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
      await loadAdminData();
    }
  }

  async function saveServiceData() {
    if (!supabase) return;

    setSavingService(true);
    setServiceState({ type: "loading", message: "Salvando serviço..." });

    const payload = {
      name: serviceForm.name.trim(),
      slug: buildSlug(serviceForm.name),
      description: serviceForm.description.trim(),
      base_price: Number(serviceForm.base_price || 0),
      icon: serviceForm.icon,
      sort_order: Number(serviceForm.sort_order || 0),
      is_active: Boolean(serviceForm.is_active)
    };

    const query = serviceForm.id
      ? supabase.from("services").update(payload).eq("id", serviceForm.id)
      : supabase.from("services").insert(payload);

    const { error } = await query;

    if (error) {
      setServiceState({
        type: "error",
        message:
          "Não foi possível salvar o serviço. Verifique o slug, as permissões ou dados duplicados."
      });
      setSavingService(false);
      return false;
    }

    setServiceState({
      type: "success",
      message: serviceForm.id
        ? "Serviço atualizado com sucesso."
        : "Serviço criado com sucesso."
    });
    setServiceForm(initialServiceForm);
    await Promise.all([loadAdminData(), loadPublicServices()]);
    setSavingService(false);
    return true;
  }

  async function handleServiceSubmit(event) {
    event.preventDefault();
    await saveServiceData();
  }

  async function handleDeleteService(service) {
    if (!supabase) return;

    const confirmed = window.confirm(
      `Remover o serviço "${service.name}" do painel?`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase.from("services").delete().eq("id", service.id);

    if (error) {
      setServiceState({
        type: "error",
        message:
          "Não foi possível remover o serviço. Confirme a política de exclusão no Supabase."
      });
      return;
    }

    setServiceState({
      type: "success",
      message: "Serviço removido com sucesso."
    });

    if (serviceForm.id === service.id) {
      setServiceForm(initialServiceForm);
    }

    await Promise.all([loadAdminData(), loadPublicServices()]);
  }

  async function handleBudgetSubmit(event) {
    event.preventDefault();

    if (!supabase) return;

    if (!selectedBudgetServiceObjects.length) {
      setBudgetState({
        type: "error",
        message: "Selecione pelo menos um serviço para criar o orçamento."
      });
      return;
    }

    setSavingBudget(true);
    setBudgetState({ type: "loading", message: "Salvando orçamento..." });

    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .upsert(
        {
          name: budgetForm.name.trim(),
          phone: budgetForm.phone.trim(),
          address: budgetForm.address.trim()
        },
        { onConflict: "phone" }
      )
      .select("id")
      .single();

    if (clientError) {
      setBudgetState({
        type: "error",
        message: "Não foi possível salvar os dados do cliente do orçamento."
      });
      setSavingBudget(false);
      return;
    }

    const budgetPayload = {
      client_id: clientData?.id ?? null,
      customer_name: budgetForm.name.trim(),
      customer_phone: budgetForm.phone.trim(),
      customer_address: budgetForm.address.trim(),
      notes: budgetForm.notes.trim(),
      status: "pendente",
      subtotal_amount: budgetSubtotal,
      total_amount: budgetFinalTotal
    };

    const { data: budgetRecord, error: budgetError } = await supabase
      .from("budgets")
      .insert(budgetPayload)
      .select("id")
      .single();

    if (budgetError || !budgetRecord) {
      setBudgetState({
        type: "error",
        message: "Não foi possível salvar o orçamento no Supabase."
      });
      setSavingBudget(false);
      return;
    }

    const budgetItemsPayload = selectedBudgetServiceObjects.map((service) => ({
      budget_id: budgetRecord.id,
      service_id: service.id,
      service_name_snapshot: service.name,
      price_snapshot: Number(service.base_price || 0)
    }));

    const { error: itemsError } = await supabase
      .from("budget_items")
      .insert(budgetItemsPayload);

    if (itemsError) {
      await supabase.from("budgets").delete().eq("id", budgetRecord.id);
      setBudgetState({
        type: "error",
        message: "Não foi possível salvar os itens do orçamento."
      });
      setSavingBudget(false);
      return;
    }

    setBudgetState({
      type: "success",
      message: "Orçamento criado com sucesso."
    });
    setBudgetForm(initialBudgetForm);
    setSelectedBudgetServices([]);
    await loadAdminData();
    setSavingBudget(false);
  }

  async function handleBudgetStatusChange(budgetId, nextStatus) {
    if (!supabase) return;

    const { error } = await supabase
      .from("budgets")
      .update({ status: nextStatus })
      .eq("id", budgetId);

    if (!error) {
      await loadAdminData();
    }
  }

  async function handleDeleteBudget(budgetId) {
    if (!supabase) return;

    const confirmed = window.confirm("Excluir este orçamento?");

    if (!confirmed) {
      return;
    }

    const { error } = await supabase.from("budgets").delete().eq("id", budgetId);

    if (error) {
      setBudgetState({
        type: "error",
        message: "Não foi possível excluir o orçamento."
      });
      return;
    }

    setBudgetState({
      type: "success",
      message: "Orçamento removido com sucesso."
    });
    await loadAdminData();
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleServiceFormChange(event) {
    const { name, value, type, checked } = event.target;
    setServiceForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function handleBudgetFormChange(event) {
    const { name, value } = event.target;
    setBudgetForm((current) => ({ ...current, [name]: value }));
  }

  function toggleService(serviceId) {
    setSelectedServices((current) =>
      current.includes(serviceId)
        ? current.filter((item) => item !== serviceId)
        : [...current, serviceId]
    );
  }

  function toggleBudgetService(serviceId) {
    setSelectedBudgetServices((current) =>
      current.includes(serviceId)
        ? current.filter((item) => item !== serviceId)
        : [...current, serviceId]
    );
  }

  function openServiceEditor(service) {
    setServiceForm({
      id: service.id,
      name: service.name,
      description: service.description,
      base_price: String(service.base_price ?? ""),
      icon: service.icon || "leaf",
      sort_order: String(service.sort_order ?? 0),
      is_active: Boolean(service.is_active)
    });
    setServiceState({ type: "", message: "" });
    setActiveSection("services");
  }

  function resetServiceForm() {
    setServiceForm(initialServiceForm);
    setServiceState({ type: "", message: "" });
  }

  function resetBudgetForm() {
    setBudgetForm(initialBudgetForm);
    setSelectedBudgetServices([]);
    setBudgetState({ type: "", message: "" });
  }

  function seedLocalPreview() {
    setForm({
      name: "Residencial Bosque Verde",
      phone: "(41) 98888-1200",
      address: "Rua das Araucárias, 1200 - Curitiba",
      notes: "Fazer acabamento nas bordas e revisar canteiros."
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
              <p className="eyebrow">Jardinagem profissional</p>
              <h1>JC Jardins</h1>
            </div>
          </div>

          <nav className="sidebar-nav">
            {publicSections.map((section) => (
              <button
                key={section.id}
                className={`nav-link ${activeSection === section.id ? "active" : ""}`}
                onClick={() => setActiveSection(section.id)}
                type="button"
              >
                {section.label}
              </button>
            ))}
          </nav>

          <div className="sidebar-divider">
            <span>Painel administrativo</span>
          </div>

          <nav className="sidebar-nav">
            {adminSections.map((section) => (
              <button
                key={section.id}
                className={`nav-link ${activeSection === section.id ? "active" : ""}`}
                onClick={() => setActiveSection(section.id)}
                type="button"
              >
                {section.label}
              </button>
            ))}
          </nav>

          <div className="sidebar-card">
            <p className="eyebrow">Operação</p>
            <h3>Site público na frente e painel protegido por login no mesmo projeto</h3>
            <p>
              O cliente solicita online, o pedido entra no painel e você gerencia
              serviços, clientes e andamento sem mexer no código.
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
                    Seu jardim bonito e bem cuidado, sem complicação.
                  </p>
                  <p className="hero-text">
                    Contrate vários serviços em uma única solicitação, com
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
                      Solicitar Serviço
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
                    <span className="hero-badge">
                      Atendimento em Curitiba e região metropolitana
                    </span>
                    <span className="hero-badge">
                      Vários serviços no mesmo pedido
                    </span>
                  </div>
                </div>

                <div className="hero-visual">
                  <div className="leaf leaf-one" />
                  <div className="leaf leaf-two" />
                  <div className="leaf leaf-three" />
                  <div className="garden-card">
                    <span className="garden-chip">Pedido inteligente</span>
                    <h4>Contrate tudo em uma única solicitação</h4>
                    <div className="garden-mini-list">
                      <div className="garden-mini-item">
                        <div>
                          <strong>Mais praticidade</strong>
                          <small>
                            O cliente escolhe vários serviços em poucos toques.
                          </small>
                        </div>
                      </div>
                      <div className="garden-mini-item">
                        <div>
                          <strong>Resumo claro</strong>
                          <small>
                            Nome, endereço, serviços e observações antes de enviar.
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              <section className="section-heading compact">
                <div>
                  <p className="eyebrow">Serviços</p>
                  <h3>Escolha um ou vários serviços</h3>
                </div>
                {!hasSupabaseEnv && (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={seedLocalPreview}
                  >
                    Preencher exemplo
                  </button>
                )}
              </section>

              <div className="service-catalog">
                {loadingServices ? (
                  <div className="panel-card">Carregando serviços...</div>
                ) : (
                  services.map((service) => {
                    const selected = selectedServices.includes(service.id);

                    return (
                      <article
                        className={`service-card ${selected ? "selected" : ""}`}
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
                              selected ? "is-selected" : ""
                            }`}
                            type="button"
                            onClick={() => toggleService(service.id)}
                          >
                            {selected ? "Selecionado" : "Adicionar"}
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>

              <section className="section-heading compact testimonials-heading">
                <div>
                  <p className="eyebrow">Avaliações</p>
                  <h3>O que os clientes dizem</h3>
                </div>
              </section>

              <div className="testimonials-grid">
                {testimonials.map((testimonial) => (
                  <article className="testimonial-card" key={testimonial.name}>
                    <div className="testimonial-stars" aria-label={`${testimonial.rating} de 5 estrelas`}>
                      {Array.from({ length: 5 }, (_, index) => (
                        <span
                          key={`${testimonial.name}-${index}`}
                          className={index < testimonial.rating ? "filled" : ""}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <p className="testimonial-comment">“{testimonial.comment}”</p>
                    <strong className="testimonial-name">{testimonial.name}</strong>
                  </article>
                ))}
              </div>

              <section id="request-form" className="request-shell">
                <article className="request-card">
                  <div className="request-intro">
                    <div>
                      <p className="eyebrow">Solicitação</p>
                      <h3>Monte seu pedido</h3>
                    </div>
                    <span className="live-pill">Múltiplos serviços</span>
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
                        Endereço
                        <input
                          name="address"
                          value={form.address}
                          onChange={handleFormChange}
                          placeholder="Rua, número e bairro"
                          required
                        />
                      </label>
                      <label className="full-span">
                        Observações
                        <textarea
                          name="notes"
                          value={form.notes}
                          onChange={handleFormChange}
                          rows={4}
                          placeholder="Conte o que precisa, horário, ponto de referência ou detalhes do local"
                        />
                      </label>
                    </div>

                    <div className="multi-service-header">
                      <div>
                        <p className="eyebrow">Seleção de serviços</p>
                        <h4>Marque um ou vários itens</h4>
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
                          <strong>{form.name || "Não informado"}</strong>
                        </div>
                        <div>
                          <span className="summary-label">Endereço</span>
                          <strong>{form.address || "Não informado"}</strong>
                        </div>
                        <div className="full-span">
                          <span className="summary-label">Serviços selecionados</span>
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
                                Selecione um ou mais serviços para montar o pedido.
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="full-span">
                          <span className="summary-label">Observações</span>
                          <strong>{form.notes || "Sem observações adicionais."}</strong>
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
                        Enviar solicitação
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
                    Quando o cliente selecionar vários serviços, o pedido já fica
                    pronto para envio sem precisar entrar em contato várias vezes.
                  </p>
                  <div className="highlight-points">
                    <div className="highlight-item">
                      <strong>1 pedido</strong>
                      <span>vários serviços no mesmo fluxo</span>
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

          {activeSection === "dashboard" && (
            <section className="section-panel active">
              <AdminGate
                session={adminSession}
                adminProfile={adminProfile}
                authForm={authForm}
                authState={authState}
                checkingAdmin={checkingAdmin}
                setAuthForm={setAuthForm}
                onSubmit={handleAdminLogin}
                onLogout={handleLogout}
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Dashboard</p>
                    <h3>Visão geral da operação</h3>
                  </div>
                </div>

                {loadingAdmin ? (
                  <div className="panel-card">Carregando painel...</div>
                ) : (
                  <>
                    <div className="stats-grid">
                      <article className="stat-card">
                        <span>Pedidos pendentes</span>
                        <strong>{pendingOrders}</strong>
                        <small>aguardando atendimento</small>
                      </article>
                      <article className="stat-card">
                        <span>Em andamento</span>
                        <strong>{inProgressOrders}</strong>
                        <small>serviços em execução</small>
                      </article>
                      <article className="stat-card accent">
                        <span>Concluídos</span>
                        <strong>{completedOrders}</strong>
                        <small>pedidos finalizados</small>
                      </article>
                      <article className="stat-card">
                        <span>Faturamento bruto</span>
                        <strong>{formatCurrency(totalRevenue)}</strong>
                        <small>baseado nos pedidos salvos</small>
                      </article>
                    </div>

                    <div className="admin-grid">
                      <article className="panel-card">
                        <div className="panel-header">
                          <div>
                            <p className="eyebrow">Pedidos recentes</p>
                            <h3>Últimas solicitações</h3>
                          </div>
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => setActiveSection("orders")}
                          >
                            Ver pedidos
                          </button>
                        </div>

                        <div className="list-stack compact-list">
                          {orders.slice(0, 4).map((order) => (
                            <article className="admin-list-row" key={order.id}>
                              <div>
                                <strong>{order.client?.name || "Cliente"}</strong>
                                <p className="muted">
                                  {formatDate(order.requested_at)} |{" "}
                                  {(order.order_items || [])
                                    .map((item) => item.service_name_snapshot)
                                    .join(", ")}
                                </p>
                              </div>
                              <span className={`status-chip ${statusClass(order.status)}`}>
                                {formatStatusLabel(order.status)}
                              </span>
                            </article>
                          ))}
                          {!orders.length && (
                            <div className="empty-state-card">
                              Nenhum pedido recebido ainda.
                            </div>
                          )}
                        </div>
                      </article>

                      <article className="panel-card">
                        <div className="panel-header">
                          <div>
                            <p className="eyebrow">Base cadastrada</p>
                            <h3>Resumo rápido</h3>
                          </div>
                        </div>

                        <div className="highlight-points">
                          <div className="highlight-item">
                            <strong>{clients.length} clientes</strong>
                            <span>cadastros salvos no banco</span>
                          </div>
                          <div className="highlight-item">
                            <strong>{adminServices.length} serviços</strong>
                            <span>catálogo configurado no painel</span>
                          </div>
                          <div className="highlight-item">
                            <strong>{adminServices.filter((item) => item.is_active).length} ativos</strong>
                            <span>visíveis para o cliente no site</span>
                          </div>
                        </div>
                      </article>
                    </div>
                  </>
                )}
              </AdminGate>
            </section>
          )}

          {activeSection === "orders" && (
            <section className="section-panel active">
              <AdminGate
                session={adminSession}
                adminProfile={adminProfile}
                authForm={authForm}
                authState={authState}
                checkingAdmin={checkingAdmin}
                setAuthForm={setAuthForm}
                onSubmit={handleAdminLogin}
                onLogout={handleLogout}
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Pedidos</p>
                    <h3>Pedidos recebidos</h3>
                  </div>
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
                                  {formatStatusLabel(order.status)}
                                </span>
                              </p>
                              <h4>
                                {(order.order_items || []).length} serviço(s) para{" "}
                                {order.client?.name || "Cliente"}
                              </h4>
                              <p className="muted">
                                {order.client?.phone || "Sem telefone"} |{" "}
                                {formatDate(order.requested_at)}
                              </p>
                              <p className="muted">{order.client?.address}</p>
                              <p className="muted">
                                {order.notes || "Sem observações adicionais."}
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
                                <option value="concluido">concluído</option>
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

          {activeSection === "services" && (
            <section className="section-panel active">
              <AdminGate
                session={adminSession}
                adminProfile={adminProfile}
                authForm={authForm}
                authState={authState}
                checkingAdmin={checkingAdmin}
                setAuthForm={setAuthForm}
                onSubmit={handleAdminLogin}
                onLogout={handleLogout}
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Serviços</p>
                    <h3>Gerencie o catálogo</h3>
                  </div>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={resetServiceForm}
                  >
                    Novo serviço
                  </button>
                </div>

                <div className="admin-grid">
                  <article className="panel-card">
                    <div className="panel-header">
                      <div>
                        <p className="eyebrow">
                          {serviceForm.id ? "Edicao" : "Cadastro"}
                        </p>
                        <h3>
                          {serviceForm.id ? "Editar serviço" : "Adicionar serviço"}
                        </h3>
                      </div>
                    </div>

                    <form className="request-form" onSubmit={handleServiceSubmit}>
                      <div className="form-grid">
                        <label className="full-span">
                          Nome do serviço
                          <input
                            name="name"
                            value={serviceForm.name}
                            onChange={handleServiceFormChange}
                            placeholder="Ex: Plantio e revitalizacao"
                            required
                          />
                        </label>
                        <label className="full-span">
                          Descrição
                          <textarea
                            name="description"
                            value={serviceForm.description}
                            onChange={handleServiceFormChange}
                            rows={4}
                            placeholder="Descreva rapidamente o que esta incluso"
                            required
                          />
                        </label>
                        <label>
                          Preco base
                          <input
                            name="base_price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={serviceForm.base_price}
                            onChange={handleServiceFormChange}
                            placeholder="0,00"
                            required
                          />
                        </label>
                        <label>
                          Ordem
                          <input
                            name="sort_order"
                            type="number"
                            min="0"
                            step="1"
                            value={serviceForm.sort_order}
                            onChange={handleServiceFormChange}
                            placeholder="0"
                          />
                        </label>
                        <label>
                          Icone
                          <select
                            name="icon"
                            value={serviceForm.icon}
                            onChange={handleServiceFormChange}
                          >
                            <option value="leaf">Folha</option>
                            <option value="grass">Grama</option>
                            <option value="terrain">Terreno</option>
                            <option value="shears">Tesoura</option>
                          </select>
                        </label>
                        <label className="inline-toggle">
                          <span>Ativo no site</span>
                          <input
                            name="is_active"
                            type="checkbox"
                            checked={serviceForm.is_active}
                            onChange={handleServiceFormChange}
                          />
                        </label>
                      </div>

                      {serviceState.message && (
                        <p className={`feedback ${serviceState.type}`}>
                          {serviceState.message}
                        </p>
                      )}

                      <div className="request-actions">
                        <button className="primary-button" type="submit" disabled={savingService}>
                          {serviceForm.id ? "Salvar alterações" : "Criar serviço"}
                        </button>
                        {serviceForm.id && (
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={resetServiceForm}
                          >
                            Cancelar edição
                          </button>
                        )}
                      </div>
                    </form>
                  </article>

                  <article className="panel-card">
                    <div className="panel-header">
                      <div>
                        <p className="eyebrow">Catálogo</p>
                        <h3>Serviços cadastrados</h3>
                      </div>
                    </div>

                    <div className="list-stack compact-list">
                      {loadingAdmin ? (
                        <div className="empty-state-card">Carregando serviços...</div>
                      ) : adminServices.length ? (
                        adminServices.map((service) => (
                          <article className="admin-list-row service-admin-row" key={service.id}>
                            <div className="service-admin-main">
                              <div
                                className="service-icon"
                                dangerouslySetInnerHTML={{ __html: iconMarkup(service.icon) }}
                              />
                              <div>
                                <strong>{service.name}</strong>
                                <p className="muted">{service.description}</p>
                                <div className="order-service-list">
                                  <span className="order-service-chip">
                                    {formatCurrency(service.base_price)}
                                  </span>
                                  <span className="order-service-chip">
                                    {service.is_active ? "Ativo" : "Oculto"}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="inline-actions">
                              {serviceForm.id === service.id ? (
                                <>
                                  <button
                                    className="secondary-button success-button"
                                    type="button"
                                    onClick={saveServiceData}
                                    disabled={savingService}
                                  >
                                    Salvar
                                  </button>
                                  <button
                                    className="secondary-button"
                                    type="button"
                                    onClick={resetServiceForm}
                                  >
                                    Cancelar edição
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="secondary-button"
                                    type="button"
                                    onClick={() => openServiceEditor(service)}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    className="secondary-button danger-button"
                                    type="button"
                                    onClick={() => handleDeleteService(service)}
                                  >
                                    Excluir
                                  </button>
                                </>
                              )}
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="empty-state-card">
                          Nenhum serviço cadastrado ainda.
                        </div>
                      )}
                    </div>
                  </article>
                </div>
              </AdminGate>
            </section>
          )}

          {activeSection === "budgets" && (
            <section className="section-panel active">
              <AdminGate
                session={adminSession}
                adminProfile={adminProfile}
                authForm={authForm}
                authState={authState}
                checkingAdmin={checkingAdmin}
                setAuthForm={setAuthForm}
                onSubmit={handleAdminLogin}
                onLogout={handleLogout}
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Orçamentos</p>
                    <h3>Monte e envie orçamentos</h3>
                  </div>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={resetBudgetForm}
                  >
                    Novo orçamento
                  </button>
                </div>

                <div className="admin-grid">
                  <article className="panel-card">
                    <div className="panel-header">
                      <div>
                        <p className="eyebrow">Criação manual</p>
                        <h3>Gerar orçamento</h3>
                      </div>
                    </div>

                    <form className="request-form" onSubmit={handleBudgetSubmit}>
                      <div className="form-grid">
                        <label>
                          Nome do cliente
                          <input
                            name="name"
                            value={budgetForm.name}
                            onChange={handleBudgetFormChange}
                            placeholder="Nome do cliente"
                            required
                          />
                        </label>
                        <label>
                          Telefone
                          <input
                            name="phone"
                            value={budgetForm.phone}
                            onChange={handleBudgetFormChange}
                            placeholder="(41) 99999-9999"
                            required
                          />
                        </label>
                        <label className="full-span">
                          Endereço
                          <input
                            name="address"
                            value={budgetForm.address}
                            onChange={handleBudgetFormChange}
                            placeholder="Rua, número e bairro"
                            required
                          />
                        </label>
                        <label className="full-span">
                          Observações
                          <textarea
                            name="notes"
                            value={budgetForm.notes}
                            onChange={handleBudgetFormChange}
                            rows={4}
                            placeholder="Informações adicionais para o cliente"
                          />
                        </label>
                      </div>

                      <div className="multi-service-header">
                        <div>
                          <p className="eyebrow">Serviços do orçamento</p>
                          <h4>Selecione um ou vários serviços</h4>
                        </div>
                        <span className="selection-count">
                          {selectedBudgetServiceObjects.length} selecionado(s)
                        </span>
                      </div>

                      <div className="service-picker">
                        {adminServices.map((service) => {
                          const selected = selectedBudgetServices.includes(service.id);
                          return (
                            <label
                              key={service.id}
                              className={`picker-card ${selected ? "selected" : ""}`}
                            >
                              <input
                                className="service-checkbox"
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleBudgetService(service.id)}
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
                                  <span className="price-pill inline-price-pill">
                                    {formatCurrency(service.base_price)}
                                  </span>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      <article className="order-summary-card">
                        <div className="panel-header">
                          <div>
                            <p className="eyebrow">Resumo do orçamento</p>
                            <h4>Valor calculado automaticamente</h4>
                          </div>
                          <span className="price-pill">
                            Subtotal {formatCurrency(budgetSubtotal)}
                          </span>
                        </div>

                        <div className="summary-grid">
                          <div className="full-span">
                            <span className="summary-label">Serviços</span>
                            <div
                              className={`summary-services ${
                                selectedBudgetServiceObjects.length ? "" : "empty-summary"
                              }`}
                            >
                              {selectedBudgetServiceObjects.length ? (
                                selectedBudgetServiceObjects.map((service) => (
                                  <span className="summary-chip" key={service.id}>
                                    {service.name}
                                  </span>
                                ))
                              ) : (
                                <span>Selecione os serviços que farão parte do orçamento.</span>
                              )}
                            </div>
                          </div>
                          <label>
                            Valor final manual
                            <input
                              name="manualTotal"
                              type="number"
                              min="0"
                              step="0.01"
                              value={budgetForm.manualTotal}
                              onChange={handleBudgetFormChange}
                              placeholder="Opcional"
                            />
                          </label>
                          <div className="summary-total-box">
                            <span className="summary-label">Total do orçamento</span>
                            <strong>{formatCurrency(budgetFinalTotal)}</strong>
                          </div>
                        </div>
                      </article>

                      {budgetState.message && (
                        <p className={`feedback ${budgetState.type}`}>
                          {budgetState.message}
                        </p>
                      )}

                      <div className="request-actions">
                        <button className="primary-button" type="submit" disabled={savingBudget}>
                          Criar orçamento
                        </button>
                        <a
                          className={`whatsapp-panel-button ${
                            selectedBudgetServiceObjects.length &&
                            budgetForm.name &&
                            budgetForm.phone &&
                            budgetForm.address
                              ? ""
                              : "disabled-link"
                          }`}
                          href={budgetWhatsappHref}
                          target="_blank"
                          rel="noreferrer"
                          aria-disabled={
                            selectedBudgetServiceObjects.length &&
                            budgetForm.name &&
                            budgetForm.phone &&
                            budgetForm.address
                              ? "false"
                              : "true"
                          }
                        >
                          <WhatsAppIcon />
                          <span>Enviar pelo WhatsApp</span>
                        </a>
                      </div>
                    </form>
                  </article>

                  <article className="panel-card">
                    <div className="panel-header">
                      <div>
                        <p className="eyebrow">Histórico</p>
                        <h3>Orçamentos criados</h3>
                      </div>
                    </div>

                    <div className="list-stack compact-list">
                      {loadingAdmin ? (
                        <div className="empty-state-card">Carregando orçamentos...</div>
                      ) : budgets.length ? (
                        budgets.map((budget) => (
                          <article className="admin-list-row budget-row" key={budget.id}>
                            <div className="budget-main">
                              <strong>{budget.customer_name}</strong>
                              <p className="muted">
                                {budget.customer_phone} | {budget.customer_address}
                              </p>
                              <p className="muted">
                                {budget.notes || "Sem observações adicionais."}
                              </p>
                              <div className="order-service-list">
                                {(budget.budget_items || []).map((item) => (
                                  <span className="order-service-chip" key={item.id}>
                                    {item.service_name_snapshot}
                                  </span>
                                ))}
                              </div>
                              <div className="budget-meta">
                                <span className={`status-chip ${budgetStatusClass(budget.status)}`}>
                                  {formatBudgetStatus(budget.status)}
                                </span>
                                <strong>{formatCurrency(budget.total_amount)}</strong>
                              </div>
                            </div>
                            <div className="admin-order-side">
                              <select
                                value={budget.status}
                                onChange={(event) =>
                                  handleBudgetStatusChange(budget.id, event.target.value)
                                }
                              >
                                <option value="pendente">pendente</option>
                                <option value="aprovado">aprovado</option>
                                <option value="recusado">recusado</option>
                              </select>
                              <a
                                className="secondary-link admin-whats-link"
                                href={buildBudgetWhatsAppHref({
                                  name: budget.customer_name,
                                  phone: budget.customer_phone,
                                  address: budget.customer_address,
                                  notes: budget.notes,
                                  services: (budget.budget_items || []).map((item) => ({
                                    name: item.service_name_snapshot
                                  })),
                                  totalAmount: budget.total_amount
                                })}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <WhatsAppIcon />
                                <span>WhatsApp</span>
                              </a>
                              <button
                                className="secondary-button danger-button"
                                type="button"
                                onClick={() => handleDeleteBudget(budget.id)}
                              >
                                Excluir
                              </button>
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="empty-state-card">
                          Nenhum orçamento cadastrado ainda.
                        </div>
                      )}
                    </div>
                  </article>
                </div>
              </AdminGate>
            </section>
          )}

          {activeSection === "clients" && (
            <section className="section-panel active">
              <AdminGate
                session={adminSession}
                adminProfile={adminProfile}
                authForm={authForm}
                authState={authState}
                checkingAdmin={checkingAdmin}
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
                      clients.map((client) => {
                        const history = client.orders || [];
                        const lastOrder = history[0];
                        const totalClientRevenue = history.reduce(
                          (sum, order) => sum + Number(order.total_amount || 0),
                          0
                        );

                        return (
                          <article className="mini-card client-card" key={client.id}>
                            <div className="mini-card-top">
                              <h4>{client.name}</h4>
                              <span className="tag">Cliente</span>
                            </div>
                            <p className="muted">{client.phone}</p>
                            <p className="muted">{client.address}</p>
                            <div className="client-history">
                              <div className="client-history-item">
                                <strong>{history.length}</strong>
                                <span>pedido(s)</span>
                              </div>
                              <div className="client-history-item">
                                <strong>{formatCurrency(totalClientRevenue)}</strong>
                                <span>total salvo</span>
                              </div>
                            </div>
                            <p className="muted">
                              Último pedido:{" "}
                              {lastOrder ? formatDate(lastOrder.requested_at) : "ainda sem pedidos"}
                            </p>
                          </article>
                        );
                      })
                    ) : (
                      <div className="panel-card">Nenhum cliente encontrado.</div>
                    )}
                  </div>
                )}
              </AdminGate>
            </section>
          )}

          {!hasSupabaseEnv && (
            <div className="panel-card env-warning">
              O app está em modo local. Configure <code>VITE_SUPABASE_URL</code> e{" "}
              <code>VITE_SUPABASE_ANON_KEY</code> para conectar o banco real.
            </div>
          )}
        </main>
      </div>
    </>
  );
}

function AdminGate({
  session,
  adminProfile,
  authForm,
  authState,
  checkingAdmin,
  setAuthForm,
  onSubmit,
  onLogout,
  children
}) {
  if (checkingAdmin) {
    return <div className="panel-card">Validando acesso administrativo...</div>;
  }

  if (session && adminProfile) {
    return (
      <>
        <div className="admin-toolbar">
          <div className="admin-user-chip">
            <span className="tag">Admin conectado</span>
            <strong>{adminProfile.full_name || adminProfile.email}</strong>
          </div>
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
          Use um usuário do Supabase Auth que esteja cadastrado na tabela
          <code> admin_users </code>
          para acessar o painel.
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
    "Olá, gostaria de solicitar um atendimento da JC Jardins.",
    "",
    `Nome: ${name}`,
    `Telefone: ${phone}`,
    `Endereço: ${address}`,
    `Serviços: ${services.map((item) => item.name).join(", ")}`,
    `Observações: ${notes || "Sem observações adicionais."}`
  ].join("\n");

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function buildBudgetWhatsAppHref({
  name,
  phone,
  address,
  notes,
  services,
  totalAmount
}) {
  if (!services.length || !name || !phone || !address) {
    return `https://wa.me/${whatsappNumber}`;
  }

  const message = [
    `Olá, ${name}.`,
    "Segue seu orçamento da JC Jardins, com atendimento profissional e serviços planejados para o seu espaço.",
    "",
    `Cliente: ${name}`,
    `Telefone: ${phone}`,
    `Endereço: ${address}`,
    `Serviços: ${services.map((item) => item.name).join(", ")}`,
    `Valor total: ${formatCurrency(totalAmount)}`,
    `Observações: ${notes || "Sem observações adicionais."}`,
    "",
    "Se quiser, podemos agendar a execução e confirmar os detalhes pelo WhatsApp."
  ].join("\n");

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function buildSlug(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(value)
  );
}

function formatStatusLabel(status) {
  return {
    pendente: "Pendente",
    "em andamento": "Em andamento",
    concluido: "Concluído"
  }[status] || status;
}

function formatBudgetStatus(status) {
  return {
    pendente: "Pendente",
    aprovado: "Aprovado",
    recusado: "Recusado"
  }[status] || status;
}

function statusClass(status) {
  return {
    pendente: "agendada",
    "em andamento": "andamento",
    concluido: "concluida"
  }[status] || "agendada";
}

function budgetStatusClass(status) {
  return {
    pendente: "agendada",
    aprovado: "concluida",
    recusado: "cancelada"
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
