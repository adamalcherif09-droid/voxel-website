function App() {
  var _loading = React.useState(true); var loading = _loading[0]; var setLoading = _loading[1];
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

  React.useEffect(function () {
    Promise.all([
      storageGet("voxel-catalog"),
      storageGet("voxel-inquiries"),
      storageGet("voxel-settings"),
      storageGet("voxel-content"),
    ]).then(function (results) {
      var catalogResult = results[0];
      var inquiriesResult = results[1];
      var settingsResult = results[2];
      var contentResult = results[3];

      // A failed read means "unknown state", NOT "empty shop". Seeding
      // defaults over a temporarily-unreadable database is exactly how
      // a real catalog gets erased, so on any read failure we show a
      // retry screen and touch nothing.
      if (!catalogResult.ok || !inquiriesResult.ok || !settingsResult.ok || !contentResult.ok) {
        setLoadError(true);
        return;
      }

      var savedCatalog = catalogResult.value;
      var savedInquiries = inquiriesResult.value;
      var savedSettings = settingsResult.value;
      var savedContent = contentResult.value;

      var catalogPromise;
      if (savedCatalog) {
        setCatalog({ categories: savedCatalog.categories || [], models: savedCatalog.models || [] });
        catalogPromise = Promise.resolve();
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
        catalogPromise = storageSet("voxel-catalog", { categories: DEFAULT_CATEGORIES, models: [] });
      }

      setInquiries(savedInquiries || []);

      var settingsPromise;
      if (savedSettings) {
        var savedSecurity = Object.assign({}, savedSettings.security || {});
        // Migrate a pre-hash plaintext passcode (from before this update)
        // into a hash, rather than silently reverting to the default one.
        // The write-back here is best-effort and intentionally unauthenticated:
        // it may be rejected for an existing doc (fine — the migrated hash
        // lives in state and gets persisted on the owner's next real save).
        var migrationStep = Promise.resolve();
        if (!savedSecurity.passcodeHash && savedSecurity.passcode) {
          migrationStep = sha256(savedSecurity.passcode).then(function (hash) {
            savedSecurity.passcodeHash = hash;
          });
        }
        settingsPromise = migrationStep.then(function () {
          delete savedSecurity.passcode;
          var mergedSettings = Object.assign({}, DEFAULT_SETTINGS, savedSettings, {
            security: Object.assign({}, DEFAULT_SECURITY, savedSecurity),
          });
          setSettings(mergedSettings);
          return storageSet("voxel-settings", mergedSettings);
        });
      } else {
        setSettings(DEFAULT_SETTINGS);
        settingsPromise = storageSet("voxel-settings", DEFAULT_SETTINGS);
      }

      var contentPromise;
      var mergedContent = savedContent ? Object.assign({}, DEFAULT_CONTENT, savedContent) : DEFAULT_CONTENT;
      setContent(mergedContent);
      contentPromise = savedContent ? Promise.resolve() : storageSet("voxel-content", mergedContent);

      Promise.all([catalogPromise, settingsPromise, contentPromise]).then(function () {
        setLoading(false);
      });
    });
  }, []);

  // Owner-dashboard saves are loud: if the server doesn't confirm the
  // write, say so immediately instead of letting changes silently
  // vanish on the next refresh.
  function guardedSave(key, value) {
    return storageSet(key, value, { admin: true }).then(function (ok) {
      if (!ok) alert("Saving failed — your change was NOT saved.\n\nCheck your internet connection and try again. If you were logged out of the dashboard, redo the footer entry and apply the change again.");
      return ok;
    });
  }

  function persistCatalog(updater) {
    var resolved;
    setCatalog(function (prev) {
      resolved = typeof updater === "function" ? updater(prev.categories, prev.models) : updater;
      return resolved;
    });
    // setCatalog's updater above runs synchronously in React's batching,
    // so `resolved` is already set by the time we get here.
    return guardedSave("voxel-catalog", resolved);
  }
  function persistSettings(updaterOrValue) {
    var resolved;
    setSettings(function (prev) {
      resolved = typeof updaterOrValue === "function" ? updaterOrValue(prev) : updaterOrValue;
      return resolved;
    });
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
  function logInquiry(channel) {
    if (!orderPopupItem) return;
    var entry = {
      id: makeId("inq"),
      type: orderPopupItem.type,
      label: orderPopupItem.type === "custom" ? "Custom order" : orderPopupItem.name,
      note: orderPopupItem.note || "",
      fileName: orderPopupItem.fileName || "",
      channel: channel,
      createdAt: Date.now(),
    };
    // Append through the public endpoint (server caps the list). If the
    // current list can't be read reliably, skip saving rather than risk
    // overwriting history — the Discord ping below still fires.
    storageGet("voxel-inquiries").then(function (result) {
      if (!result.ok) return;
      var latest = result.value || [];
      var known = latest.some(function (i) { return i && i.id === entry.id; });
      if (known) return;
      setInquiries([entry].concat(latest));
      saveInquiryRemote(entry);
    });
    pingDiscord(settings.webhookUrl, "New inquiry via " + channel + ": " + entry.label + (entry.note ? " — " + entry.note : ""));
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
    return <SkeletonScreen />;
  }

  return (
    <div className="voxel-root">
      <Header content={content} goHome={goHome} goCustom={goCustom} />
      <main>
        {view === "home" && <HomeView content={content} categories={categories} models={models} goCategory={goCategory} goCustom={goCustom} onOrderModel={openCatalogOrder} onViewModel={setViewingModel} />}
        {view === "category" && activeCategory && <CategoryView content={content} category={activeCategory} models={models} goBack={goHome} onOrderModel={openCatalogOrder} onViewModel={setViewingModel} />}
        {view === "custom" && <CustomOrderView content={content} goBack={goHome} onOrderNow={handleCustomOrderNow} />}
        {view === "admin-gate" && <AdminGate security={settings.security || DEFAULT_SECURITY} onSuccess={handleGateSuccess} />}
        {view === "admin" && isAdmin && (
          <AdminView tab={adminTab} setTab={setAdminTab} inquiries={inquiries}
            categories={categories} models={models} addCategory={addCategory} renameCategory={renameCategory} deleteCategory={deleteCategory}
            addModel={addModel} updateModel={updateModel} deleteModel={deleteModel} toggleFeatured={toggleFeatured} importModels={importModels}
            settings={settings} updateSettings={persistSettings} content={content} updateContent={persistContent} goHome={goHome} />
        )}
      </main>
      <Footer content={content} security={settings.security || DEFAULT_SECURITY} onTrigger={handleFooterTrigger} />

      {viewingModel && (
        <ModelDetailPopup
          content={content}
          model={viewingModel}
          onOrder={function () { openCatalogOrder(viewingModel); setViewingModel(null); }}
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
    </div>
  );
}

var rootEl = document.getElementById("root");
var root = ReactDOM.createRoot(rootEl);
root.render(<App />);
