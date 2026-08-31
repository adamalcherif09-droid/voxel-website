function App() {
  var _loading = React.useState(true); var loading = _loading[0]; var setLoading = _loading[1];
  // Flips true if the initial catalog/content load is still going after a
  // few seconds — a cold-start Atlas read can be slow. We keep waiting,
  // but surface a friendly "still waking up" note (with the storageGet
  // timeout as the hard backstop) so the skeleton never looks frozen.
  var _slowLoad = React.useState(false); var slowLoad = _slowLoad[0]; var setSlowLoad = _slowLoad[1];
  var _content = React.useState(DEFAULT_CONTENT); var content = _content[0]; var setContent = _content[1];
  var _catalog = React.useState({ categories: [], models: [] }); var catalog = _catalog[0]; var setCatalog = _catalog[1];
  var categories = catalog.categories;
  var models = catalog.models;
  var _inquiries = React.useState([]); var inquiries = _inquiries[0]; var setInquiries = _inquiries[1];
  var _settings = React.useState(DEFAULT_SETTINGS); var settings = _settings[0]; var setSettings = _settings[1];

  var _view = React.useState("home"); var view = _view[0]; var setView = _view[1];
  var _activeCategory = React.useState(null); var activeCategory = _activeCategory[0]; var setActiveCategory = _activeCategory[1];
  var _orderPopupItem = React.useState(null); var orderPopupItem = _orderPopupItem[0]; var setOrderPopupItem = _orderPopupItem[1];
  var _viewingModel = React.useState(null); var viewingModel = _viewingModel[0]; var setViewingModel = _viewingModel[1];
  var _isAdmin = React.useState(false); var isAdmin = _isAdmin[0]; var setIsAdmin = _isAdmin[1];
  var _adminTab = React.useState("orders"); var adminTab = _adminTab[0]; var setAdminTab = _adminTab[1];
  var _loadError = React.useState(false); var loadError = _loadError[0]; var setLoadError = _loadError[1];

  // Shopping cart: a plain array of line items that lives in the
  // visitor's localStorage (see loadCart/saveCart in helpers.js). It is
  // customer-side state only — nothing about it touches the backend.
  var _cart = React.useState(loadCart); var cart = _cart[0]; var setCart = _cart[1];
  var _cartOpen = React.useState(false); var cartOpen = _cartOpen[0]; var setCartOpen = _cartOpen[1];
  var _quickAddModel = React.useState(null); var quickAddModel = _quickAddModel[0]; var setQuickAddModel = _quickAddModel[1];
  var _cartToast = React.useState(false); var cartToast = _cartToast[0]; var setCartToast = _cartToast[1];
  var toastTimer = React.useRef(null);
  // A cart that was saved on this device before the customer ordered a
  // design directly (which clears it at the redirect). On their next
  // visit we offer it back instead of letting it vanish silently.
  var _savedCartOffer = React.useState(null); var savedCartOffer = _savedCartOffer[0]; var setSavedCartOffer = _savedCartOffer[1];

  React.useEffect(function () {
    // One-time offer on load: a previous "Order now" cleared the saved
    // cart but archived it here first — ask whether to bring it back.
    var archived = readCartArchive();
    if (archived && archived.length) setSavedCartOffer(archived);
  }, []);
  // Tracks the last thing added so the toast can offer an Undo, and
  // guards the checkout against a double-tap logging the same order
  // twice (the WhatsApp link itself is a real <a> now, so it keeps
  // working even where browsers block window.open popups like iOS).
  var _lastAdd = React.useState(null); var lastAdd = _lastAdd[0]; var setLastAdd = _lastAdd[1];
  var checkingOutRef = React.useRef(false);
  React.useEffect(function () { saveCart(cart); }, [cart]);
  React.useEffect(function () {
    return function () { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  React.useEffect(function () {
    var slowTimer = setTimeout(function () { setSlowLoad(true); }, 7000);
    Promise.all([
      storageGet("voxel-catalog"),
      storageGet("voxel-settings"),
      storageGet("voxel-content"),
    ]).then(function (results) {
      clearTimeout(slowTimer);
      var catalogResult = results[0];
      var settingsResult = results[1];
      var contentResult = results[2];

      // A failed read means "unknown state", NOT "empty shop". Seeding
      // defaults over a temporarily-unreadable database is exactly how
      // a real catalog gets erased, so on any read failure we show a
      // retry screen and touch nothing.
      if (!catalogResult.ok || !settingsResult.ok || !contentResult.ok) {
        setLoadError(true);
        return;
      }

      var savedCatalog = catalogResult.value;
      var savedSettings = settingsResult.value;
      var savedContent = contentResult.value;

      // The SERVER seeds defaults for any missing key at startup, so
      // the browser never needs (and is never allowed) to write shop
      // data without an admin session.
      if (savedCatalog) {
        setCatalog({ categories: savedCatalog.categories || [], models: savedCatalog.models || [] });
        // If this page was opened from a link that points at one
        // specific model (the seller tapping the link inside a
        // WhatsApp order message, for example), open that model's
        // photo/details automatically instead of just the home page.
        try {
          var sharedId = new URLSearchParams(window.location.search).get("model");
          if (sharedId) {
            var sharedModel = (savedCatalog.models || []).find(function (m) { return m.id === sharedId; });
            if (sharedModel) setViewingModel(sharedModel);
          }
        } catch (e) { /* no query string support — just show the home page */ }
      } else {
        setCatalog({ categories: DEFAULT_CATEGORIES, models: [] });
      }

      // Inquiries are private (customer names/notes) — they are loaded
      // with the admin session token only after the owner passes the
      // gate, never on the public page load.
      setInquiries([]);

      if (savedSettings) {
        var savedSecurity = Object.assign({}, savedSettings.security || {});
        var mergedSettings = Object.assign({}, DEFAULT_SETTINGS, savedSettings, {
          security: Object.assign({}, DEFAULT_SECURITY, savedSecurity),
        });
        setSettings(mergedSettings);
      } else {
        setSettings(DEFAULT_SETTINGS);
      }

      setContent(savedContent ? Object.assign({}, DEFAULT_CONTENT, savedContent) : DEFAULT_CONTENT);
      setLoading(false);
    });
  }, []);

  // Seasonal look: the owner picks a theme in Content > "Seasonal look";
  // it is applied here as a data-theme attribute on <html> and the CSS
  // in styles.css re-skins the palette. Unknown/missing values fall
  // back to the default look — a corrupted content document can never
  // break the site's appearance.
  React.useEffect(function () {
    try {
      var themeId = content.theme;
      if (themeId && isKnownTheme(themeId) && themeId !== "default") {
        document.documentElement.setAttribute("data-theme", themeId);
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        var match = null;
        for (var i = 0; i < SITE_THEMES.length; i++) {
          if (SITE_THEMES[i].id === themeId) { match = SITE_THEMES[i]; break; }
        }
        meta.setAttribute("content", match ? match.canvas : "#d5c4ba");
      }
    } catch (e) { /* theme is cosmetic — never block rendering */ }
  }, [content.theme]);

  var _reauthHint = React.useState(false); var reauthHint = _reauthHint[0]; var setReauthHint = _reauthHint[1];
  var pendingWriteRef = React.useRef(null);

  // Owner-dashboard saves are loud: if the server doesn't confirm the
  // write, say so immediately instead of letting changes silently
  // vanish on the next refresh.
  function guardedSave(key, value, _retried) {
    return storageSet(key, value, { admin: true }).then(function (out) {
      if (out.ok) return true;
      if (out.status === 401) {
        // The admin session is dead — this page's token was issued
        // before the last server restart/redeploy. Stash the change and
        // put the owner back at the door; re-entering the gate issues a
        // fresh token and the save is then re-applied automatically (see
        // handleGateSuccess), so the edit is never lost and never has to
        // be redone by hand.
        pendingWriteRef.current = { key: key, value: value };
        setReauthHint(true);
        setIsAdmin(false);
        setView("admin-gate");
        return false;
      }
      if (!_retried && out.status >= 500) {
        // Transient server hiccup (database blip etc.) — one automatic
        // retry before bothering the owner. Never retries 401/400/413.
        return new Promise(function (resolve) {
          setTimeout(function () { resolve(guardedSave(key, value, true)); }, 900);
        });
      }
      alert("Saving failed — your change was NOT saved (server response " + (out.status || "network error") + ").\n\nCheck your internet connection and try again. If you were logged out of the dashboard, redo the footer entry and apply the change again.");
      return false;
    });
  }

  function persistCatalog(updater) {
    // Compute the next catalog synchronously from the state we have right
    // now, then save THAT object. React 18 does not guarantee that a
    // function updater passed to setCatalog has been executed by the time
    // the following line runs (updaters are applied during the scheduled
    // render, not during setState), so capturing the value inside the
    // updater could leave `next` undefined and POST `{value: undefined}`
    // -> the server replies 400 missing_value and the change is lost.
    var next = typeof updater === "function" ? updater(catalog.categories, catalog.models) : updater;
    setCatalog(next);
    return guardedSave("voxel-catalog", next);
  }
  function persistSettings(updaterOrValue) {
    // Compute the next settings SYNCHRONOUSLY from the state we already
    // have (same reason as persistCatalog below): React 18 does not
    // guarantee a function updater passed to setState has run by the time
    // the following line executes, so reading a variable captured inside
    // the updater can POST {value: undefined} -> the server replies 400
    // missing_value and the save silently fails with "Saving failed".
    var resolved = typeof updaterOrValue === "function" ? updaterOrValue(settings) : updaterOrValue;
    var clean = Object.assign({}, resolved);
    if (clean.security && typeof clean.security === "object") {
      clean.security = Object.assign({}, clean.security);
      delete clean.security._updatePasscode;
      delete clean.security.passcodeNew;
    }
    delete clean._updateWebhook;
    delete clean.webhookUrl;
    setSettings(clean);
    return guardedSave("voxel-settings", resolved);
  }
  function persistContent(next) {
    setContent(next);
    return guardedSave("voxel-content", next);
  }

  function goHome() { setView("home"); setActiveCategory(null); }
  function goCategory(cat) { setActiveCategory(cat); setView("category"); }
  function goCustom() { setView("custom"); }
  function handleFooterTrigger() {
    setView(isAdmin ? "admin" : "admin-gate");
  }

  function openCatalogOrder(model) {
    setOrderPopupItem({ type: "catalog", id: model.id, name: model.name });
  }
  function handleCustomOrderNow(data) {
    setOrderPopupItem({ type: "custom", name: "Custom order", note: data.note, fileName: data.fileName });
  }

  // --- Cart actions ---
  function openQuickAdd(model) { setQuickAddModel(model); }
  function closeQuickAdd() { setQuickAddModel(null); }
  function showCartToast() {
    setCartToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(function () { setCartToast(false); }, 2800);
  }
  function handleAddToCart(model, qty) {
    if (!model) return;
    var addQty = clampQty(qty);
    setLastAdd({ modelId: model.id, added: addQty });
    setCart(function (prev) {
      var next = prev.slice();
      var hit = null;
      for (var i = 0; i < next.length; i++) {
        if (next[i].modelId === model.id) { hit = next[i]; break; }
      }
      if (hit) hit.qty = Math.min(MAX_CART_QTY, hit.qty + addQty);
      else next.push({ modelId: model.id, name: model.name, price: String(model.price), image: model.image || "", qty: addQty });
      return next;
    });
    closeQuickAdd();
    showCartToast();
  }
  function undoLastAdd() {
    var target = lastAdd;
    if (!target) return;
    setLastAdd(null);
    setCartToast(false);
    setCart(function (prev) {
      var next = [];
      for (var i = 0; i < prev.length; i++) {
        if (prev[i].modelId !== target.modelId) { next.push(prev[i]); continue; }
        var rest = prev[i].qty - target.added;
        if (rest > 0) next.push(Object.assign({}, prev[i], { qty: rest }));
      }
      return next;
    });
  }
  function handleCartQty(modelId, delta) {
    setCart(function (prev) {
      var next = [];
      var changed = false;
      for (var i = 0; i < prev.length; i++) {
        if (prev[i].modelId !== modelId) { next.push(prev[i]); continue; }
        var q = prev[i].qty + delta;
        if (q >= 1) next.push(Object.assign({}, prev[i], { qty: clampQty(q) }));
        changed = true;
      }
      if (!changed) return prev;
      return next;
    });
  }
  function handleCartRemove(modelId) {
    setCart(function (prev) { return prev.filter(function (it) { return it.modelId !== modelId; }); });
  }
  function handleCartQtyTo(modelId, qty) {
    setCart(function (prev) {
      var next = [];
      for (var i = 0; i < prev.length; i++) {
        if (prev[i].modelId !== modelId) { next.push(prev[i]); continue; }
        next.push(Object.assign({}, prev[i], { qty: clampQty(qty) }));
      }
      return next;
    });
  }
  function handleRestoreSavedCart(restore) {
    if (restore && savedCartOffer && savedCartOffer.length) {
      // Replace the current cart with the archived one. The archive is the
      // cart the customer "ordered away", so it is authoritative — merging
      // could double up an item that is still lingering in the live cart
      // key (e.g. if the clear raced with a fast redirect to WhatsApp).
      setCart(savedCartOffer.map(function (it) {
        return { modelId: it.modelId, name: String(it.name || ""), price: String(it.price), image: String(it.image || ""), qty: clampQty(it.qty) };
      }));
    }
    clearCartArchive();
    setSavedCartOffer(null);
  }
  function logCartInquiry(items, channel) {
    var entry = {
      id: makeId("inq"),
      type: "cart",
      label: "Cart order",
      note: items.map(function (it) { return it.name + " \u00d7 " + it.qty; }).join(", "),
      fileName: "",
      channel: channel,
      createdAt: Date.now(),
    };
    setInquiries(function (prev) { return [entry].concat(prev); });
    saveInquiryRemote(entry);
    // Discord notification is sent by the SERVER from the sanitized
    // entry — the browser never talks to the webhook path at all.
  }
  function handleCartCheckout() {
    // The drawer's checkout is a real link the cart computed at render
    // time, so this handler only logs the order and closes the drawer.
    // The ref guards a double-tap / double-click from logging one order
    // twice — the inquiry list is de-duplicated by id anyway, but two
    // WhatsApp tabs opening is still confusing for the owner.
    if (!cart.length || checkingOutRef.current) return;
    checkingOutRef.current = true;
    logCartInquiry(cart, "whatsapp");
    setCartOpen(false);
    setTimeout(function () { checkingOutRef.current = false; }, 1500);
  }
  function logInquiry(channel) {
    if (!orderPopupItem) return;
    // "Order now" is a direct order for THIS item, not the saved cart.
    // The moment the visitor is redirected to WhatsApp / Instagram, their
    // saved cart is cleared (and archived) so the two never mix. We clear
    // localStorage synchronously here (in addition to setCart) so that a
    // fast redirect to WhatsApp never outruns the saveCart effect and
    // leaves a stale cart behind — a stale cart would otherwise re-appear
    // on the next visit AND merge with the archive, doubling quantities.
    if (cart.length) {
      archiveCart(cart);
      clearCartStorage();
      setCart([]);
    }
    var entry = {
      id: makeId("inq"),
      type: orderPopupItem.type,
      label: orderPopupItem.type === "custom" ? "Custom order" : orderPopupItem.name,
      note: orderPopupItem.note || "",
      fileName: orderPopupItem.fileName || "",
      channel: channel,
      createdAt: Date.now(),
    };
    // Append through the public endpoint — the server sanitizes,
    // de-duplicates, and caps the list. No pre-read here: the inquiry
    // list is owner-private now, and the server serializes writes so
    // simultaneous customers can't erase each other's entries.
    setInquiries(function (prev) { return [entry].concat(prev); });
    saveInquiryRemote(entry);
    // Discord notification is sent by the SERVER from the sanitized
    // entry — the browser never talks to the webhook path at all.
  }

  function deleteInquiry(id) {
    var next = inquiries.filter(function (i) { return i && i.id !== id; });
    setInquiries(next);
    return guardedSave("voxel-inquiries", next);
  }
  function clearInquiries() {
    setInquiries([]);
    return guardedSave("voxel-inquiries", []);
  }

  function addCategory(name) {
    return persistCatalog(function (prevCategories, prevModels) {
      return { categories: prevCategories.concat([{ id: makeId("cat"), name: name }]), models: prevModels };
    });
  }
  function renameCategory(id, name) {
    return persistCatalog(function (prevCategories, prevModels) {
      return { categories: prevCategories.map(function (c) { return c.id === id ? Object.assign({}, c, { name: name }) : c; }), models: prevModels };
    });
  }
  function deleteCategory(id) {
    return persistCatalog(function (prevCategories, prevModels) {
      return { categories: prevCategories.filter(function (c) { return c.id !== id; }), models: prevModels };
    });
  }
  function addModel(data) {
    return persistCatalog(function (prevCategories, prevModels) {
      return { categories: prevCategories, models: prevModels.concat([Object.assign({}, data, { id: makeId("model"), createdAt: Date.now() })]) };
    });
  }
  function updateModel(id, data) {
    return persistCatalog(function (prevCategories, prevModels) {
      return { categories: prevCategories, models: prevModels.map(function (m) { return m.id === id ? Object.assign({}, m, data) : m; }) };
    });
  }
  function deleteModel(id) {
    return persistCatalog(function (prevCategories, prevModels) {
      return { categories: prevCategories, models: prevModels.filter(function (m) { return m.id !== id; }) };
    });
  }
  function toggleFeatured(id) {
    return persistCatalog(function (prevCategories, prevModels) {
      return { categories: prevCategories, models: prevModels.map(function (m) { return m.id === id ? Object.assign({}, m, { featured: !m.featured }) : m; }) };
    });
  }
  function importModels(newModels) {
    return persistCatalog(function (prevCategories, prevModels) {
      return { categories: prevCategories, models: prevModels.concat(newModels) };
    });
  }

  function handleGateSuccess() {
    setIsAdmin(true);
    setView("admin");
    setReauthHint(false);
    // The inquiry list is owner-private: pull it now, with the admin
    // session token the gate just obtained. Best-effort — the dashboard
    // shows an empty state if it can't be read.
    apiGetInquiries().then(function (result) {
      if (result.ok && Array.isArray(result.value)) setInquiries(result.value);
    });
    // A save that failed earlier because the session had died is retried
    // automatically with the brand-new token, so the owner doesn't have
    // to remember and redo the change they already made.
    if (pendingWriteRef.current) {
      var pending = pendingWriteRef.current;
      pendingWriteRef.current = null;
      guardedSave(pending.key, pending.value);
    }
  }

  function handleLogout() {
    // Kill the session server-side too, so a token that got out (this
    // or another tab) can't be replayed anywhere else. Leaving the
    // dashboard local-first keeps it instant even if the network dies.
    apiLogout().catch(function () {});
    setAdminApiToken("");
    setIsAdmin(false);
    setView("admin-gate");
    setReauthHint(false);
  }

  if (loadError) {
    return (
      <div className="voxel-root">
        <div className="max-w-md mx-auto px-6 py-24 text-center">
          <div className="font-display text-xl" style={{ color: "var(--ink)" }}>Can't reach the shop right now</div>
          <p className="text-sm mt-3" style={{ color: "var(--ink-dim)" }}>
            The shop's data couldn't be loaded, so nothing is being shown rather than risk displaying — or overwriting —
            the real catalog. This is usually a temporary connection problem.
          </p>
          <div className="mt-6">
            <PrimaryButton onClick={function () { window.location.reload(); }}>Try again</PrimaryButton>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="voxel-root">
        <SkeletonScreen />
        {slowLoad && (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-transparent pointer-events-none" style={{ pointerEvents: "none" }}>
            <div className="mx-auto mb-16 px-5 py-3 rounded-lg text-center text-sm" style={{ background: "var(--cta-soft)", border: "1px solid var(--brass)", color: "var(--ink)" }}>
              Still waking up — this can take a moment on a cold start.
            </div>
          </div>
        )}
      </div>
    );
  }

  var cartCheckoutUrl = cart.length > 0 ? buildWhatsAppUrl(content.whatsappNumber || content.contactPhone, buildCartMessage(cart, content.currencySymbol)) : null;

  return (
    <div className="voxel-root">
      <Header content={content} goHome={goHome} goCustom={goCustom} cartCount={cartItemCount(cart)} onCartOpen={function () { setCartOpen(true); }} />
      <main>
        {view === "home" && <HomeView content={content} categories={categories} models={models} goCategory={goCategory} goCustom={goCustom} onOrderModel={openCatalogOrder} onViewModel={setViewingModel} onAddToCart={openQuickAdd} />}
        {view === "category" && activeCategory && <CategoryView content={content} category={activeCategory} models={models} goBack={goHome} onOrderModel={openCatalogOrder} onViewModel={setViewingModel} onAddToCart={openQuickAdd} />}
        {view === "custom" && <CustomOrderView content={content} goBack={goHome} onOrderNow={handleCustomOrderNow} />}
        {view === "admin-gate" && <AdminGate security={settings.security || DEFAULT_SECURITY} notice={reauthHint} onSuccess={handleGateSuccess} />}
        {view === "admin" && isAdmin && (
          <AdminView tab={adminTab} setTab={setAdminTab} inquiries={inquiries}
            deleteInquiry={deleteInquiry} clearInquiries={clearInquiries}
            categories={categories} models={models} addCategory={addCategory} renameCategory={renameCategory} deleteCategory={deleteCategory}
            addModel={addModel} updateModel={updateModel} deleteModel={deleteModel} toggleFeatured={toggleFeatured} importModels={importModels}
            settings={settings} updateSettings={persistSettings} content={content} updateContent={persistContent} goHome={goHome} onSignOut={handleLogout} />
        )}
      </main>
      <Footer content={content} security={settings.security || DEFAULT_SECURITY} onTrigger={handleFooterTrigger} />

      {viewingModel && (
        <ModelDetailPopup
          content={content}
          model={viewingModel}
          onOrder={function () { openCatalogOrder(viewingModel); setViewingModel(null); }}
          onAddToCart={function () { openQuickAdd(viewingModel); }}
          onClose={function () { setViewingModel(null); }}
        />
      )}

      {orderPopupItem && (
        <OrderContactPopup
          content={content}
          item={orderPopupItem}
          onLogInquiry={logInquiry}
          onClose={function () { setOrderPopupItem(null); }}
        />
      )}

      {savedCartOffer && savedCartOffer.length && (
        <RestoreCartPopup
          items={savedCartOffer}
          count={cartItemCount(savedCartOffer)}
          onKeep={function () { handleRestoreSavedCart(true); }}
          onDiscard={function () { handleRestoreSavedCart(false); }}
        />
      )}

      {quickAddModel && (
        <QuickAddPopup
          key={quickAddModel.id}
          model={quickAddModel}
          content={content}
          onAdd={handleAddToCart}
          onClose={closeQuickAdd}
        />
      )}

      <CartDrawer
        open={cartOpen}
        items={cart}
        content={content}
        checkoutUrl={cartCheckoutUrl}
        onClose={function () { setCartOpen(false); }}
        onChangeQty={handleCartQty}
        onChangeQtyTo={handleCartQtyTo}
        onRemove={handleCartRemove}
        onCheckout={handleCartCheckout}
      />

      <CartToast
        visible={cartToast}
        label={lastAdd ? (cart.find(function (it) { return it.modelId === lastAdd.modelId; }) || { name: "" }).name : null}
        onUndo={undoLastAdd}
        onViewCart={function () { setCartToast(false); setCartOpen(true); }}
      />
    </div>
  );
}

var rootEl = document.getElementById("root");
var root = ReactDOM.createRoot(rootEl);
root.render(<ErrorBoundary><App /></ErrorBoundary>);
