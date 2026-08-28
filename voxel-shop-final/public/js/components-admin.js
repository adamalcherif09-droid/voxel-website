/* ---------------------------------------------------------
   Owner entry — hidden footer trigger, then a shape
   combination, then a passcode. No labels on this screen
   on purpose. All three steps are editable from inside the
   dashboard once you are in.
--------------------------------------------------------- */
function AdminGate(props) {
  var sec = props.security || DEFAULT_SECURITY;
  var _stage = React.useState("combo"); var stage = _stage[0]; var setStage = _stage[1];
  var _comboProgress = React.useState([]); var comboProgress = _comboProgress[0]; var setComboProgress = _comboProgress[1];
  var _pw = React.useState(""); var pw = _pw[0]; var setPw = _pw[1];
  var _showPw = React.useState(false); var showPw = _showPw[0]; var setShowPw = _showPw[1];
  var _error = React.useState(""); var error = _error[0]; var setError = _error[1];
  var _shake = React.useState(false); var shake = _shake[0]; var setShake = _shake[1];
  var _attempts = React.useState(0); var attempts = _attempts[0]; var setAttempts = _attempts[1];
  var _checking = React.useState(false); var checking = _checking[0]; var setChecking = _checking[1];
  var _setupCurrent = React.useState(""); var setupCurrent = _setupCurrent[0]; var setSetupCurrent = _setupCurrent[1];
  var _setupNew = React.useState(""); var setupNew = _setupNew[0]; var setSetupNew = _setupNew[1];
  var _setupError = React.useState(""); var setupError = _setupError[0]; var setSetupError = _setupError[1];
  var _setupChecking = React.useState(false); var setupChecking = _setupChecking[0]; var setSetupChecking = _setupChecking[1];

  function pressShape(shape) {
    var next = comboProgress.concat([shape]);
    var expected = sec.combo.slice(0, next.length);
    var matches = next.every(function (s, i) { return s === expected[i]; });
    if (!matches) {
      setComboProgress([]);
      setShake(true);
      setTimeout(function () { setShake(false); }, 350);
      return;
    }
    if (next.length >= sec.combo.length) {
      setComboProgress([]);
      setError("");
      setStage("password");
      return;
    }
    setComboProgress(next);
  }

  function submitPassword() {
    if (checking || !pw) return;
    setChecking(true);
    // The server is the single source of truth for the passcode — it
    // verifies and returns a short-lived admin session token. The hash
    // is never shipped to browsers, so it can't be brute-forced offline.
    apiAuthDetailed(pw).then(function (r) {
      setChecking(false);
      if (r && r.token) {
        setAdminApiToken(r.token);
        setPw("");
        props.onSuccess();
        return;
      }
      if (r && r.status === 403 && r.error === "setup_required") {
        // Fresh install: the stored passcode is a one-time setup code.
        // Route to the forced handover screen instead of the door.
        setPw("");
        setAttempts(0);
        setStage("setup");
        return;
      }
      var nextAttempts = attempts + 1;
      setPw("");
      if (nextAttempts >= 3) {
        setAttempts(0);
        setStage("combo");
        setComboProgress([]);
        setError("");
      } else {
        setAttempts(nextAttempts);
        setError(nextAttempts + " of 3");
      }
    });
  }

  function submitSetup() {
    var trimmed = (setupNew || "").trim();
    if (setupChecking) return;
    if (!setupCurrent || setupNew.length === 0) {
      setSetupError("Enter both fields.");
      return;
    }
    if (trimmed.length < 12) {
      setSetupError("The new passcode must be at least 12 characters.");
      return;
    }
    if (trimmed === setupCurrent) {
      setSetupError("The new passcode must be different from the setup one.");
      return;
    }
    setSetupChecking(true);
    setSetupError("");
    fetch("/api/auth/change-default", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current: setupCurrent, newPassword: trimmed }),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (json) { return { status: res.status, json: json }; });
      })
      .then(function (r) {
        setSetupChecking(false);
        if (r.json && r.json.token) {
          setAdminApiToken(r.json.token);
          setSetupCurrent("");
          setSetupNew("");
          props.onSuccess();
          return;
        }
        var msg;
        if (r.status === 400 && r.json.error === "passcode_too_short") msg = "Make the new passcode at least 12 characters.";
        else if (r.status === 400 && r.json.error === "default_passcode_not_allowed") msg = "That's the well-known default passcode — please choose your own.";
        else if (r.status === 400 && r.json.error === "passcode_must_differ") msg = "The new passcode must be different from the setup one.";
        else if (r.status === 401 && r.json.error === "wrong_passcode") msg = "The setup passcode isn't right — check the one printed in the server log.";
        else if (r.status === 429) msg = "Too many attempts — wait a minute and try again.";
        else msg = "Couldn't finish setup right now. Reload the page and try the door again.";
        setSetupError(msg);
      })
      .catch(function () {
        setSetupChecking(false);
        setSetupError("Couldn't reach the server — check your connection and try again.");
      });
  }

  return (
    <div className="max-w-sm mx-auto px-5 py-24 text-center">
      {props.notice && (
        <p className="mb-5 text-sm rounded-md px-3 py-2" style={{ background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--ink)" }}>
          Your dashboard session expired, so that change wasn't saved. Enter the door again and it will be applied automatically.
        </p>
      )}
      <Lock size={26} style={{ color: "var(--ink-dim)" }} className="mx-auto" />

      {stage === "combo" && (
        <div className="mt-8">
          <div className={"flex items-center justify-center gap-3 flex-wrap" + (shake ? " voxel-shake" : "")}>
            {COMBO_SHAPES.map(function (shape) {
              return (
                <button key={shape} type="button" data-shape={shape} onClick={function () { pressShape(shape); }} className="cursor-pointer rounded-md" style={{ width: 48, height: 48, background: "var(--panel)", border: "1px solid var(--line)" }}>
                  <ShapeIcon shape={shape} />
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-2 mt-5">
            {sec.combo.map(function (_, i) {
              return <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < comboProgress.length ? "var(--brass)" : "var(--line)", display: "inline-block" }} />;
            })}
          </div>
        </div>
      )}

      {stage === "password" && (
        <div className="mt-8 flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type={showPw ? "text" : "password"}
              value={pw}
              onChange={function (e) { setPw(e.target.value); }}
              onKeyDown={function (e) { if (e.key === "Enter") submitPassword(); }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              className="flex-1 px-3.5 py-2.5 rounded-md text-sm text-center"
              style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }}
            />
            <button type="button" onClick={function () { setShowPw(function (s) { return !s; }); }} aria-label="Toggle visibility" className="cursor-pointer rounded-md flex items-center justify-center" style={{ width: 42, background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-dim)" }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && <div className="text-xs" style={{ color: "var(--danger)" }}>{error}</div>}
          <PrimaryButton onClick={submitPassword} disabled={checking}>{checking ? "Checking…" : "Enter"}</PrimaryButton>
        </div>
      )}

      {stage === "setup" && (
        <div className="mt-8 flex flex-col gap-3 text-left">
          <p className="text-sm" style={{ color: "var(--ink)" }}>
            This is the first time the owner door has opened on this site. Before your dashboard is usable, pick a hidden passcode only you know.
          </p>
          <input
            type="password"
            value={setupCurrent}
            onChange={function (e) { setSetupCurrent(e.target.value); }}
            placeholder="One-time setup passcode"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            className="w-full px-3.5 py-2.5 rounded-md text-sm text-center"
            style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }}
          />
          <input
            type="password"
            value={setupNew}
            onChange={function (e) { setSetupNew(e.target.value); }}
            onKeyDown={function (e) { if (e.key === "Enter") submitSetup(); }}
            placeholder="New passcode — at least 12 characters"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            className="w-full px-3.5 py-2.5 rounded-md text-sm text-center"
            style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }}
          />
          <p className="text-xs" style={{ color: "var(--ink-dim)" }}>
            Tip: the setup passcode is printed once in your server log. Keep the new one somewhere only you can see.
          </p>
          {setupError && <div className="text-xs" style={{ color: "var(--danger)" }}>{setupError}</div>}
          <PrimaryButton onClick={submitSetup} disabled={setupChecking}>{setupChecking ? "Setting up…" : "Set my passcode"}</PrimaryButton>
        </div>
      )}
    </div>
  );
}

function AdminInquiries(props) {
  var inquiries = props.inquiries;
  if (inquiries.length === 0) {
    return <EmptyState icon={ClipboardList} title="No inquiries yet" body="When someone taps Order now and messages you, it will show up here." />;
  }
  return (
    <div className="flex flex-col gap-3">
      {inquiries.map(function (i) {
        return (
          <div key={i.id} className="p-4 rounded-lg" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-display text-base" style={{ color: "var(--ink)" }}>{i.label}</div>
                {i.note && <div className="text-sm mt-1" style={{ color: "var(--ink)" }}>{i.note}</div>}
                {i.fileName && <div className="text-xs mt-1 font-mono-ac" style={{ color: "var(--ink-dim)" }}>File mentioned: {i.fileName}</div>}
                <div className="text-xs mt-2" style={{ color: "var(--ink-dim)" }}>via {i.channel === "whatsapp" ? "WhatsApp" : "Instagram"} · {formatDate(i.createdAt)}</div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-mono-ac uppercase" style={{ background: i.channel === "whatsapp" ? "var(--teal-soft)" : "var(--brass-soft)", color: i.channel === "whatsapp" ? "var(--teal)" : "var(--brass-text)" }}>
                {i.type === "custom" ? "custom" : "catalog"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ModelForm(props) {
  var model = props.model;
  var categories = props.categories;
  var content = props.content;
  var _name = React.useState(model.name || ""); var name = _name[0]; var setName = _name[1];
  var _description = React.useState(model.description || ""); var description = _description[0]; var setDescription = _description[1];
  var _price = React.useState(model.price || ""); var price = _price[0]; var setPrice = _price[1];
  var _grams = React.useState(model.grams || ""); var grams = _grams[0]; var setGrams = _grams[1];
  var _printHours = React.useState(model.printHours || ""); var printHours = _printHours[0]; var setPrintHours = _printHours[1];
  var _printMinutes = React.useState(model.printMinutes || ""); var printMinutes = _printMinutes[0]; var setPrintMinutes = _printMinutes[1];
  var _categoryId = React.useState(model.categoryId || (categories[0] ? categories[0].id : "")); var categoryId = _categoryId[0]; var setCategoryId = _categoryId[1];
  var _image = React.useState(model.image || ""); var image = _image[0]; var setImage = _image[1];
  var _featured = React.useState(!!model.featured); var featured = _featured[0]; var setFeatured = _featured[1];
  var _uploading = React.useState(false); var uploading = _uploading[0]; var setUploading = _uploading[1];
  var _sourceUrl = React.useState(""); var sourceUrl = _sourceUrl[0]; var setSourceUrl = _sourceUrl[1];
  var _fetching = React.useState(false); var fetching = _fetching[0]; var setFetching = _fetching[1];
  var _fetchError = React.useState(""); var fetchError = _fetchError[0]; var setFetchError = _fetchError[1];
  var _fetchedOk = React.useState(false); var fetchedOk = _fetchedOk[0]; var setFetchedOk = _fetchedOk[1];

  // Pulls the page's Open Graph tags (title, description, cover image) via
  // Microlink's free public API and drops them straight into the form.
  function handleFetchFromLink() {
    var url = sourceUrl.trim();
    if (!url) {
      setFetchError("Paste a link first.");
      return;
    }
    setFetching(true);
    setFetchError("");
    setFetchedOk(false);
    fetch("https://api.microlink.io/?url=" + encodeURIComponent(url))
      .then(function (res) {
        if (!res.ok) throw new Error("request failed");
        return res.json();
      })
      .then(function (json) {
        if (json.status !== "success" || !json.data) throw new Error("no data");
        var d = json.data;
        var gotAnything = false;
        if (d.image && d.image.url) { setImage(d.image.url); gotAnything = true; }
        if (!gotAnything) throw new Error("empty");
        setFetchedOk(true);
      })
      .catch(function () {
        setFetchError("Could not read that link — paste the details in by hand instead.");
      })
      .finally(function () { setFetching(false); });
  }

  var pricing = (props.settings && props.settings.pricing) || DEFAULT_SETTINGS.pricing;
  function handleWeightOrTimeChange(nextGrams, nextHours, nextMinutes) {
    var calculated = calculatePrintPriceUSD(nextGrams, nextHours, nextMinutes, pricing);
    if (calculated !== null) setPrice(calculated.toFixed(2));
  }

  function handleImage(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    setUploading(true);
    compressImage(f).then(function (dataUrl) {
      setImage(dataUrl);
      setUploading(false);
    }).catch(function () { setUploading(false); });
  }
  function handleSave() {
    if (!name.trim()) return;
    props.onSave({ id: model.id, name: name.trim(), description: description.trim(), price: price, categoryId: categoryId, image: image, featured: featured, grams: grams, printHours: printHours, printMinutes: printMinutes });
  }

  return (
    <div className="p-5 rounded-lg mb-4 flex flex-col gap-4" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>
      <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
        Paste a link to pull in its photo (MakerWorld, Printables, etc.)
        <div className="flex gap-2">
          <input
            value={sourceUrl}
            onChange={function (e) { setSourceUrl(e.target.value); }}
            onKeyDown={function (e) { if (e.key === "Enter") { e.preventDefault(); handleFetchFromLink(); } }}
            placeholder="https://makerworld.com/en/models/..."
            className="flex-1 px-3 py-2 rounded-md text-sm"
            style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }}
          />
          <SecondaryButton onClick={handleFetchFromLink} icon={LinkIcon} disabled={fetching || !sourceUrl.trim()}>
            {fetching ? "Fetching…" : "Fetch from link"}
          </SecondaryButton>
        </div>
      </label>
      {fetchError && <span className="text-xs" style={{ color: "var(--danger)" }}>{fetchError}</span>}
      {fetchedOk && !fetchError && (
        <span className="text-xs" style={{ color: "var(--teal)" }}>Photo filled in below — write the name, description, and price yourself.</span>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
          Name
          <input value={name} onChange={function (e) { setName(e.target.value); }} className="px-3 py-2 rounded-md text-sm" style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
          Category
          <select value={categoryId} onChange={function (e) { setCategoryId(e.target.value); }} className="px-3 py-2 rounded-md text-sm" style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }}>
            {categories.map(function (c) { return <option key={c.id} value={c.id}>{c.name}</option>; })}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
        Description (optional)
        <textarea value={description} onChange={function (e) { setDescription(e.target.value); }} rows={2} className="px-3 py-2 rounded-md text-sm resize-none" style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }} />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
          Filament weight (g)
          <input type="number" min={0} step="1" value={grams} onChange={function (e) { var v = e.target.value; setGrams(v); handleWeightOrTimeChange(v, printHours, printMinutes); }} className="px-3 py-2 rounded-md text-sm" style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
          Print hours
          <input type="number" min={0} step="1" value={printHours} onChange={function (e) { var v = e.target.value; setPrintHours(v); handleWeightOrTimeChange(grams, v, printMinutes); }} className="px-3 py-2 rounded-md text-sm" style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
          Print minutes
          <input type="number" min={0} max={59} step="1" value={printMinutes} onChange={function (e) { var v = e.target.value; setPrintMinutes(v); handleWeightOrTimeChange(grams, printHours, v); }} className="px-3 py-2 rounded-md text-sm" style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }} />
        </label>
      </div>
      <p className="text-xs -mt-2" style={{ color: "var(--ink-dim)" }}>
        Fill these in from your slicer and the price below fills itself in — priced as PLA, using the rates set in Settings. Still fully editable if you want to round it or adjust it by hand.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
          Price ({content.currencySymbol}) — optional
          <input type="number" step="0.01" value={price} onChange={function (e) { setPrice(e.target.value); }} className="px-3 py-2 rounded-md text-sm" style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
          Photo
          <input type="file" accept="image/*" onChange={handleImage} className="text-sm" style={{ color: "var(--ink-dim)" }} />
        </label>
      </div>
      {uploading && <span className="text-xs" style={{ color: "var(--ink-dim)" }}>Preparing photo…</span>}
      {image && <img src={image} alt="Preview" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }} />}

      <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--ink)" }}>
        <input type="checkbox" checked={featured} onChange={function (e) { setFeatured(e.target.checked); }} />
        Show in Featured on the home page
      </label>

      <div className="flex gap-3">
        <PrimaryButton onClick={handleSave}>{model.id ? "Save changes" : "Add model"}</PrimaryButton>
        <SecondaryButton onClick={props.onCancel}>Cancel</SecondaryButton>
      </div>
    </div>
  );
}

function AdminCatalog(props) {
  var categories = props.categories;
  var models = props.models;
  var content = props.content;
  var _newCatName = React.useState(""); var newCatName = _newCatName[0]; var setNewCatName = _newCatName[1];
  var _editingCatId = React.useState(null); var editingCatId = _editingCatId[0]; var setEditingCatId = _editingCatId[1];
  var _editingCatName = React.useState(""); var editingCatName = _editingCatName[0]; var setEditingCatName = _editingCatName[1];
  var _filterCat = React.useState(categories[0] ? categories[0].id : ""); var filterCat = _filterCat[0]; var setFilterCat = _filterCat[1];
  var _editingModel = React.useState(null); var editingModel = _editingModel[0]; var setEditingModel = _editingModel[1];
  var _showImport = React.useState(false); var showImport = _showImport[0]; var setShowImport = _showImport[1];
  var _jsonText = React.useState(""); var jsonText = _jsonText[0]; var setJsonText = _jsonText[1];
  var _importing = React.useState(false); var importing = _importing[0]; var setImporting = _importing[1];
  var _importError = React.useState(""); var importError = _importError[0]; var setImportError = _importError[1];
  var _importSummary = React.useState(""); var importSummary = _importSummary[0]; var setImportSummary = _importSummary[1];
  var _showTvSearch = React.useState(false); var showTvSearch = _showTvSearch[0]; var setShowTvSearch = _showTvSearch[1];
  var _tvTerm = React.useState(""); var tvTerm = _tvTerm[0]; var setTvTerm = _tvTerm[1];
  var _tvCount = React.useState(30); var tvCount = _tvCount[0]; var setTvCount = _tvCount[1];
  var _tvSearching = React.useState(false); var tvSearching = _tvSearching[0]; var setTvSearching = _tvSearching[1];
  var _tvError = React.useState(""); var tvError = _tvError[0]; var setTvError = _tvError[1];
  var _tvSummary = React.useState(""); var tvSummary = _tvSummary[0]; var setTvSummary = _tvSummary[1];

  React.useEffect(function () {
    if (categories.length === 0) {
      if (filterCat !== "") setFilterCat("");
      return;
    }
    if (!categories.some(function (c) { return c.id === filterCat; })) {
      setFilterCat(categories[0].id);
    }
  }, [categories, filterCat]);

  function renameCategoryLocal(id, name) {
    props.renameCategory(id, name);
  }

  function handleDeleteCategory(id) {
    if (models.some(function (m) { return m.categoryId === id; })) {
      alert("Move or delete this category's models first.");
      return;
    }
    var cat = categories.find(function (c) { return c.id === id; });
    if (!window.confirm("Delete \"" + (cat ? cat.name : "this category") + "\"? This can't be undone.")) return;
    props.deleteCategory(id);
  }

  function handleDeleteModel(id) {
    var m = models.find(function (x) { return x.id === id; });
    if (!window.confirm("Delete \"" + (m ? m.name : "this design") + "\"? This can't be undone.")) return;
    props.deleteModel(id);
  }

  // Turns the JSON array from the bulk-collection tool into real
  // catalog models. Each embedded photo is re-compressed on the way
  // in, since raw collected photos can be a few hundred KB each.
  function handleImport() {
    setImportError("");
    setImportSummary("");
    var parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      setImportError("That doesn't look like valid JSON — copy the whole thing and paste it here.");
      return;
    }
    if (!Array.isArray(parsed)) {
      setImportError("Expected a list of models (a JSON array) — check what you copied.");
      return;
    }
    if (parsed.length === 0) {
      setImportError("That list is empty — nothing to import.");
      return;
    }
    setImporting(true);
    var validCategoryIds = {};
    categories.forEach(function (c) { validCategoryIds[c.id] = true; });
    // Skip anything whose id is already in the catalog (re-pasting the
    // same collected batch) or appears twice inside one paste — both
    // used to create confusing duplicate models.
    var existingIds = {};
    models.forEach(function (m) { existingIds[m.id] = true; });
    var batchIds = {};
    var toAdd = [];
    var skippedErrors = 0;
    var skippedNoCategory = 0;
    var skippedDuplicates = 0;

    var entries = parsed.slice();
    function processNext() {
      if (entries.length === 0) {
        finishImport();
        return;
      }
      var entry = entries.shift();
      if (!entry || entry.error || !entry.name) {
        skippedErrors += 1;
        processNext();
        return;
      }
      if (entry.id && (existingIds[entry.id] || batchIds[entry.id])) {
        skippedDuplicates += 1;
        processNext();
        return;
      }
      if (entry.id) batchIds[entry.id] = true;
      var categoryId = entry.categoryId;
      if (!validCategoryIds[categoryId]) {
        if (validCategoryIds[filterCat]) {
          categoryId = filterCat;
        } else {
          skippedNoCategory += 1;
          processNext();
          return;
        }
      }
      compressDataUrl(entry.image || "").then(function (compressedImage) {
        var pricing = (props.settings && props.settings.pricing) || DEFAULT_SETTINGS.pricing;
        var priceToUse = entry.price || "";
        if (!priceToUse) {
          var calculated = calculatePrintPriceUSD(entry.grams, entry.printHours, entry.printMinutes, pricing);
          if (calculated !== null) priceToUse = calculated.toFixed(2);
        }
        toAdd.push({
          id: entry.id || makeId("model"),
          name: String(entry.name).trim(),
          description: (entry.description || "").trim(),
          price: priceToUse,
          categoryId: categoryId,
          image: compressedImage,
          featured: !!entry.featured,
          grams: entry.grams || "",
          printHours: entry.printHours || "",
          printMinutes: entry.printMinutes || "",
          createdAt: entry.createdAt || Date.now(),
        });
        processNext();
      });
    }

    function finishImport() {
      var proceed = toAdd.length > 0 ? props.importModels(toAdd) : Promise.resolve();
      proceed.then(function () {
        setImporting(false);
        setJsonText("");
        var parts = ["Imported " + toAdd.length + " model" + (toAdd.length === 1 ? "" : "s") + "."];
        if (skippedDuplicates > 0) parts.push(skippedDuplicates + " skipped (already in your catalog).");
        if (skippedErrors > 0) parts.push(skippedErrors + " skipped (fetch errors or missing name).");
        if (skippedNoCategory > 0) parts.push(skippedNoCategory + " skipped (unrecognized category).");
        setImportSummary(parts.join(" "));
      });
    }

    processNext();
  }

  // Searches Thingiverse for the typed keyword and drops the results
  // straight into the Bulk Import box above, so they go through the
  // exact same review-then-import step as anything pasted in by hand
  // — nothing gets added to the live catalog without that click.
  function handleThingiverseSearch() {
    if (!tvTerm.trim()) return;
    setTvSearching(true);
    setTvError("");
    setTvSummary("");
    var url = "/api/thingiverse-search?q=" + encodeURIComponent(tvTerm.trim()) + "&limit=" + encodeURIComponent(tvCount);
    fetch(url)
      .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, body: body }; }); })
      .then(function (res) {
        setTvSearching(false);
        if (!res.ok) {
          setTvError(res.body && res.body.error ? res.body.error : "Search failed — try again.");
          return;
        }
        var results = res.body.results || [];
        if (results.length === 0) {
          setTvError("No commercially-licensed results found for \"" + tvTerm.trim() + "\". Try a different search term.");
          return;
        }
        setJsonText(JSON.stringify(results, null, 2));
        setShowImport(true);
        var parts = ["Found " + results.length + " model" + (results.length === 1 ? "" : "s") + " with a commercial-use license."];
        if (res.body.skippedLicense) parts.push(res.body.skippedLicense + " skipped (license doesn't allow commercial use, or wasn't specified).");
        parts.push("Review below, then click \"Import models.\"");
        setTvSummary(parts.join(" "));
      })
      .catch(function () {
        setTvSearching(false);
        setTvError("Couldn't reach the search — check your connection and try again.");
      });
  }

  return (
    <div className="flex flex-col gap-12">
      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>Categories</h3>
        <div className="flex flex-col gap-2 mb-4">
          {categories.map(function (c) {
            return (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-md" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
                {editingCatId === c.id ? (
                  <input
                    value={editingCatName}
                    onChange={function (e) { setEditingCatName(e.target.value); }}
                    onKeyDown={function (e) { if (e.key === "Enter") { renameCategoryLocal(c.id, editingCatName); setEditingCatId(null); } }}
                    className="flex-1 px-2 py-1.5 rounded text-sm"
                    style={{ background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--ink)" }}
                  />
                ) : (
                  <span className="flex-1 text-sm" style={{ color: "var(--ink)" }}>{c.name}</span>
                )}
                <span className="text-xs font-mono-ac" style={{ color: "var(--ink-dim)" }}>{models.filter(function (m) { return m.categoryId === c.id; }).length} designs</span>
                {editingCatId === c.id ? (
                  <button onClick={function () { renameCategoryLocal(c.id, editingCatName); setEditingCatId(null); }} className="cursor-pointer border-0 bg-transparent" style={{ color: "var(--brass-text)" }}><CheckCircle2 size={16} /></button>
                ) : (
                  <button onClick={function () { setEditingCatId(c.id); setEditingCatName(c.name); }} className="cursor-pointer border-0 bg-transparent" style={{ color: "var(--ink-dim)" }}><Pencil size={15} /></button>
                )}
                <button onClick={function () { handleDeleteCategory(c.id); }} className="cursor-pointer border-0 bg-transparent" style={{ color: "var(--danger)" }}><Trash2 size={15} /></button>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input value={newCatName} onChange={function (e) { setNewCatName(e.target.value); }} placeholder="New category name" className="flex-1 px-3.5 py-2.5 rounded-md text-sm" style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }} />
          <PrimaryButton icon={Plus} onClick={function () { if (newCatName.trim()) { props.addCategory(newCatName.trim()); setNewCatName(""); } }}>Add</PrimaryButton>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-lg" style={{ color: "var(--ink)" }}>Search Thingiverse</h3>
          <SecondaryButton onClick={function () { setShowTvSearch(function (s) { return !s; }); }}>{showTvSearch ? "Hide" : "Search by keyword"}</SecondaryButton>
        </div>
        {showTvSearch && (
          <div className="p-4 rounded-md flex flex-col gap-3" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>
            <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
              Search Thingiverse by keyword and pull in the most popular results at once, instead of adding links one by one. Only results whose license allows commercial use are kept — this is a best-effort filter, not legal advice, so it's still worth a quick look before selling prints of anything. Each imported design's description automatically credits the original designer and links back to it.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={tvTerm}
                onChange={function (e) { setTvTerm(e.target.value); }}
                onKeyDown={function (e) { if (e.key === "Enter" && !tvSearching) handleThingiverseSearch(); }}
                placeholder="e.g. toys and fidgets"
                className="flex-1 px-3.5 py-2.5 rounded-md text-sm"
                style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }}
              />
              <select
                value={tvCount}
                onChange={function (e) { setTvCount(Number(e.target.value)); }}
                className="px-3 py-2.5 rounded-md text-sm"
                style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }}
              >
                <option value={15}>15 results</option>
                <option value={30}>30 results</option>
                <option value={60}>60 results</option>
              </select>
              <PrimaryButton onClick={handleThingiverseSearch} disabled={tvSearching || !tvTerm.trim()}>{tvSearching ? "Searching…" : "Search"}</PrimaryButton>
            </div>
            {tvError && <span className="text-xs" style={{ color: "var(--danger)" }}>{tvError}</span>}
            {tvSummary && !tvError && <span className="text-xs" style={{ color: "var(--teal)" }}>{tvSummary}</span>}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-lg" style={{ color: "var(--ink)" }}>Bulk import</h3>
          <SecondaryButton onClick={function () { setShowImport(function (s) { return !s; }); }}>{showImport ? "Hide" : "Import from JSON"}</SecondaryButton>
        </div>
        {showImport && (
          <div className="p-4 rounded-md flex flex-col gap-3" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>
            <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
              Paste your collected list of designs here. Anything with no recognized category lands in "{(categories.find(function (c) { return c.id === filterCat; }) || {}).name || "the selected"}" category below.
            </p>
            <textarea
              value={jsonText}
              onChange={function (e) { setJsonText(e.target.value); }}
              rows={4}
              placeholder='[{"name": "...", "image": "data:image/...", "categoryId": "cat-..."}]'
              className="px-3 py-2 rounded-md text-xs font-mono-ac resize-none"
              style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }}
            />
            {importError && <span className="text-xs" style={{ color: "var(--danger)" }}>{importError}</span>}
            {importSummary && !importError && <span className="text-xs" style={{ color: "var(--teal)" }}>{importSummary}</span>}
            <div className="flex gap-2">
              <PrimaryButton onClick={handleImport} disabled={importing || !jsonText.trim()}>{importing ? "Importing…" : "Import models"}</PrimaryButton>
              <SecondaryButton onClick={function () { setJsonText(""); setImportError(""); setImportSummary(""); }} disabled={importing}>Clear</SecondaryButton>
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-display text-lg" style={{ color: "var(--ink)" }}>Models</h3>
          <div className="flex items-center gap-3">
            <select value={filterCat} onChange={function (e) { setFilterCat(e.target.value); }} className="px-3 py-2 rounded-md text-sm" style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }}>
              {categories.map(function (c) { return <option key={c.id} value={c.id}>{c.name}</option>; })}
            </select>
            <PrimaryButton icon={Plus} disabled={categories.length === 0} onClick={function () { setEditingModel({ categoryId: filterCat }); }}>Add model</PrimaryButton>
          </div>
        </div>

        {categories.length === 0 && (
          <p className="text-sm mb-4" style={{ color: "var(--ink-dim)" }}>Add a category above first — models need somewhere to live.</p>
        )}

        {editingModel && (
          <ModelForm
            model={editingModel}
            categories={categories}
            content={content}
            settings={props.settings}
            onCancel={function () { setEditingModel(null); }}
            onSave={function (data) { if (data.id) { props.updateModel(data.id, data); } else { props.addModel(data); } setEditingModel(null); }}
          />
        )}

        <div className="flex flex-col gap-3 mt-4">
          {models.filter(function (m) { return m.categoryId === filterCat; }).length === 0 && (
            <p className="text-sm" style={{ color: "var(--ink-dim)" }}>Nothing added to this category yet.</p>
          )}
          {models.filter(function (m) { return m.categoryId === filterCat; }).map(function (m) {
            return (
              <div key={m.id} className="flex items-center gap-4 p-3 rounded-md" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
                <div className="flex items-center justify-center rounded" style={{ width: 48, height: 48, background: "var(--panel-2)", flexShrink: 0 }}>
                  {m.image ? <img src={m.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6 }} /> : <ImageIcon size={16} style={{ color: "var(--ink-dim)" }} />}
                </div>
                <div className="flex-1">
                  <div className="text-sm" style={{ color: "var(--ink)" }}>{m.name}</div>
                  <div className="text-xs font-mono-ac" style={{ color: "var(--ink-dim)" }}>{m.price ? formatPriceDisplay(m.price, content) : "No price set"}</div>
                </div>
                <button onClick={function () { props.toggleFeatured(m.id); }} className="voxel-star-btn cursor-pointer border-0 bg-transparent" style={{ color: m.featured ? "var(--brass-text)" : "var(--ink-dim)" }}>
                  <Star size={17} fill={m.featured ? "var(--brass-text)" : "none"} />
                </button>
                <button onClick={function () { setEditingModel(m); }} className="cursor-pointer border-0 bg-transparent" style={{ color: "var(--ink-dim)" }}><Pencil size={15} /></button>
                <button onClick={function () { handleDeleteModel(m.id); }} className="cursor-pointer border-0 bg-transparent" style={{ color: "var(--danger)" }}><Trash2 size={15} /></button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// Module-level so its identity is stable across renders — inputs keep
// focus while typing. Reads/writes the shared content draft via props.
function ContentField(props) {
  var draft = props.draft;
  var set = props.set;
  var field = props.field;
  return (
    <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
      {props.label}
      {props.area ? (
        <textarea value={draft[field]} onChange={function (e) { set(field, e.target.value); }} rows={2} placeholder={props.placeholder} className="px-3 py-2 rounded-md text-sm resize-none" style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }} />
      ) : (
        <input value={draft[field]} onChange={function (e) { set(field, e.target.value); }} placeholder={props.placeholder} className="px-3 py-2 rounded-md text-sm" style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }} />
      )}
    </label>
  );
}

function AdminContent(props) {
  var content = props.content;
  var _draft = React.useState(content); var draft = _draft[0]; var setDraft = _draft[1];
  var _uploading = React.useState(false); var uploading = _uploading[0]; var setUploading = _uploading[1];
  var _savedMsg = React.useState(""); var savedMsg = _savedMsg[0]; var setSavedMsg = _savedMsg[1];

  function set(field, value) { setDraft(function (d) { var next = Object.assign({}, d); next[field] = value; return next; }); }

  function handleLogo(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    setUploading(true);
    compressImage(f, { preserveAlpha: true }).then(function (dataUrl) {
      set("logoImage", dataUrl);
      setUploading(false);
    }).catch(function () { setUploading(false); });
  }

  function handleSave() {
    props.updateContent(draft);
    setSavedMsg("Saved — your site is updated for every visitor.");
    setTimeout(function () { setSavedMsg(""); }, 3000);
  }

  // Field is defined OUTSIDE AdminContent on purpose: a component
  // recreated inside render gets a new identity every keystroke, React
  // remounts every input, and typing loses focus after one character.
  return (
    <div className="flex flex-col gap-10 max-w-2xl">
      <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
        Everything below is yours to rewrite. Nothing changes for visitors until you press "Save and publish" at the bottom.
      </p>

      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>Identity</h3>
        <div className="flex flex-col gap-4">
          <ContentField draft={draft} set={set} label="Business name" field="businessName" />
          <ContentField draft={draft} set={set} label="Currency symbol" field="currencySymbol" />
          <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
            Logo (replaces the default mark next to your name)
            <input type="file" accept="image/*" onChange={handleLogo} className="text-sm" style={{ color: "var(--ink-dim)" }} />
          </label>
          {uploading && <span className="text-xs" style={{ color: "var(--ink-dim)" }}>Preparing logo…</span>}
          {draft.logoImage && (
            <div className="flex items-center gap-3">
              <img src={draft.logoImage} alt="Logo preview" style={{ height: 40 }} />
              <button onClick={function () { set("logoImage", ""); }} className="text-xs cursor-pointer border-0 bg-transparent" style={{ color: "var(--danger)" }}>Remove logo</button>
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>Order via</h3>
        <p className="text-sm mb-3" style={{ color: "var(--ink-dim)" }}>
          When someone taps "Order now", they will be able to message you directly on whichever of these you fill in.
        </p>
        <div className="flex flex-col gap-4">
          <ContentField draft={draft} set={set} label="WhatsApp number (digits only, with country code — e.g. 9613123456, no plus or spaces)" field="whatsappNumber" placeholder="9613123456" />
          <ContentField draft={draft} set={set} label="Instagram username (no @)" field="instagramHandle" placeholder="yourbusiness" />
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>Social links (shown in the footer)</h3>
        <p className="text-sm mb-3" style={{ color: "var(--ink-dim)" }}>
          Fill in any of these and a link appears in the footer — tapping it opens that app directly (or its website if the app isn't installed). Your WhatsApp number and Instagram username above are reused here too, so you don't need to enter those twice.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ContentField draft={draft} set={set} label="TikTok username (no @)" field="tiktokHandle" placeholder="yourbusiness" />
          <ContentField draft={draft} set={set} label="Facebook username or page name" field="facebookHandle" placeholder="yourbusiness" />
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>Contact information (shown on the site)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ContentField draft={draft} set={set} label="Phone" field="contactPhone" placeholder="+961 ..." />
          <ContentField draft={draft} set={set} label="Email" field="contactEmail" placeholder="you@example.com" />
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>Home page</h3>
        <div className="flex flex-col gap-4">
          <ContentField draft={draft} set={set} label="Eyebrow (small line above the headline, after your business name)" field="heroEyebrow" />
          <ContentField draft={draft} set={set} label="Headline — line 1" field="heroHeadlineLine1" />
          <ContentField draft={draft} set={set} label="Headline — line 2" field="heroHeadlineLine2" />
          <ContentField draft={draft} set={set} label="Subtext" field="heroSubtext" area />
          <ContentField draft={draft} set={set} label="Featured section label" field="featuredEyebrow" />
          <ContentField draft={draft} set={set} label="Categories section label" field="categoriesEyebrow" />
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>Custom-order card (on the home page)</h3>
        <div className="flex flex-col gap-4">
          <ContentField draft={draft} set={set} label="Heading" field="customCtaHeading" />
          <ContentField draft={draft} set={set} label="Body" field="customCtaBody" area />
          <ContentField draft={draft} set={set} label="Button text" field="customCtaButton" />
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>Custom order page</h3>
        <div className="flex flex-col gap-4">
          <ContentField draft={draft} set={set} label="Heading" field="customPageHeading" />
          <ContentField draft={draft} set={set} label="Subtext" field="customPageSubtext" area />
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>How ordering works (under the hero)</h3>
        <label className="flex items-center gap-2 text-sm cursor-pointer mb-3" style={{ color: "var(--ink)" }}>
          <input type="checkbox" checked={!!draft.showHowItWorks} onChange={function (e) { set("showHowItWorks", e.target.checked); }} />
          Show the three-step strip on the home page
        </label>
        <div className="flex flex-col gap-4">
          <ContentField draft={draft} set={set} label="Section label" field="howItWorksEyebrow" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ContentField draft={draft} set={set} label="Step 1 — title" field="howItWorksStep1Title" />
            <ContentField draft={draft} set={set} label="Step 2 — title" field="howItWorksStep2Title" />
            <ContentField draft={draft} set={set} label="Step 3 — title" field="howItWorksStep3Title" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ContentField draft={draft} set={set} label="Step 1 — description (hover text)" field="howItWorksStep1Body" area />
            <ContentField draft={draft} set={set} label="Step 2 — description (hover text)" field="howItWorksStep2Body" area />
            <ContentField draft={draft} set={set} label="Step 3 — description (hover text)" field="howItWorksStep3Body" area />
          </div>
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>Catalog badges</h3>
        <label className="flex items-center gap-2 text-sm cursor-pointer mb-3" style={{ color: "var(--ink)" }}>
          <input type="checkbox" checked={!!draft.showNewBadge} onChange={function (e) { set("showNewBadge", e.target.checked); }} />
          Mark recently added designs with a brass NEW badge
        </label>
        {draft.showNewBadge !== false && (
          <ContentField draft={draft} set={set} label="Keep showing NEW for this many days after a design is added" field="newBadgeDays" />
        )}
      </section>

      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>Empty category message</h3>
        <div className="flex flex-col gap-4">
          <ContentField draft={draft} set={set} label="Title" field="emptyCategoryTitle" />
          <ContentField draft={draft} set={set} label="Body" field="emptyCategoryBody" area />
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>Footer</h3>
        <ContentField draft={draft} set={set} label="Tagline (shown right after your business name)" field="footerTagline" />
      </section>

      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>Pricing display</h3>
        <label className="flex items-center gap-2 text-sm cursor-pointer mb-3" style={{ color: "var(--ink)" }}>
          <input type="checkbox" checked={draft.showLbpConversion} onChange={function (e) { set("showLbpConversion", e.target.checked); }} />
          Also show prices converted to Lebanese Lira
        </label>
        {draft.showLbpConversion && <ContentField draft={draft} set={set} label="Exchange rate (LBP per $1)" field="lbpExchangeRate" />}
      </section>

      {savedMsg && <p className="text-sm" style={{ color: "var(--teal)" }}>{savedMsg}</p>}
      <PrimaryButton onClick={handleSave}>Save and publish</PrimaryButton>
    </div>
  );
}

/* ---------------------------------------------------------
   Prints wall manager — photos of completed orders that scroll
   across the home page. Nothing appears on the public site until
   at least one photo is saved here, so an empty shop shows no
   empty section.
--------------------------------------------------------- */
function AdminPrintsWall(props) {
  var content = props.content;
  var _draft = React.useState(content); var draft = _draft[0]; var setDraft = _draft[1];
  var _uploadingCount = React.useState(0); var uploadingCount = _uploadingCount[0]; var setUploadingCount = _uploadingCount[1];
  var _savedMsg = React.useState(""); var savedMsg = _savedMsg[0]; var setSavedMsg = _savedMsg[1];
  var prints = draft.recentPrints || [];

  function set(field, value) { setDraft(function (d) { var next = Object.assign({}, d); next[field] = value; return next; }); }
  function patchPrint(id, patch) {
    setDraft(function (d) {
      var next = Object.assign({}, d);
      next.recentPrints = (d.recentPrints || []).map(function (p) { return p.id === id ? Object.assign({}, p, patch) : p; });
      return next;
    });
  }
  function movePrint(id, dir) {
    setDraft(function (d) {
      var list = (d.recentPrints || []).slice();
      var i = list.findIndex(function (p) { return p.id === id; });
      var j = i + dir;
      if (i === -1 || j < 0 || j >= list.length) return d;
      var tmp = list[i]; list[i] = list[j]; list[j] = tmp;
      var next = Object.assign({}, d);
      next.recentPrints = list;
      return next;
    });
  }
  function removePrint(id) {
    setDraft(function (d) {
      var next = Object.assign({}, d);
      next.recentPrints = (d.recentPrints || []).filter(function (p) { return p.id !== id; });
      return next;
    });
  }

  // Photos are compressed one at a time (same pipeline as catalog
  // photos) — a whole batch at once would spike memory on phones.
  function handleFiles(e) {
    var input = e.target;
    var files = Array.prototype.slice.call((input && input.files) || []);
    input.value = "";
    if (!files.length) return;
    var room = RECENT_PRINTS_MAX - prints.length;
    if (room <= 0) {
      alert("The prints wall holds up to " + RECENT_PRINTS_MAX + " photos — remove one first.");
      return;
    }
    var accepted = files.slice(0, room);
    if (accepted.length < files.length) {
      alert("Only the first " + accepted.length + " photo" + (accepted.length === 1 ? " was" : "s were") + " added — the wall holds up to " + RECENT_PRINTS_MAX + ".");
    }
    setUploadingCount(accepted.length);
    function processNext() {
      if (!accepted.length) {
        setUploadingCount(0);
        return;
      }
      var f = accepted.shift();
      compressImage(f).then(function (dataUrl) {
        setDraft(function (d) {
          return Object.assign({}, d, { recentPrints: (d.recentPrints || []).concat([{ id: makeId("print"), image: dataUrl, caption: "" }]) });
        });
        processNext();
      }).catch(function () { processNext(); });
    }
    processNext();
  }

  function handleSave() {
    // Drop anything without a photo and normalize the numbers before
    // the content document is written for every visitor.
    var cleaned = prints
      .filter(function (p) { return p && p.image; })
      .slice(0, RECENT_PRINTS_MAX)
      .map(function (p) { return { id: p.id, image: p.image, caption: (p.caption || "").trim() }; });
    var next = Object.assign({}, draft, {
      recentPrints: cleaned,
      recentPrintsSpeed: String(Math.min(15, Math.max(1, Number(draft.recentPrintsSpeed) || 2.6))),
    });
    props.updateContent(next);
    setSavedMsg("Saved — the home page is updated for every visitor.");
    setTimeout(function () { setSavedMsg(""); }, 3000);
  }

  return (
    <div className="flex flex-col gap-10 max-w-2xl">
      <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
        Real photos of finished orders, scrolling across the home page. Proof of work converts better than anything decorative — the wall only appears once the first photo is saved below.
      </p>

      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>Display</h3>
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--ink)" }}>
            <input type="checkbox" checked={!!draft.showRecentPrints} onChange={function (e) { set("showRecentPrints", e.target.checked); }} />
            Show the prints wall on the home page
          </label>
          <ContentField draft={draft} set={set} label="Section label" field="recentPrintsEyebrow" />
          <ContentField draft={draft} set={set} label="Scroll pace — seconds each photo takes to pass (bigger = slower)" field="recentPrintsSpeed" />
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>Photos</h3>
        <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
          Add photos (you can pick several at once)
          <input type="file" accept="image/*" multiple onChange={handleFiles} className="text-sm" style={{ color: "var(--ink-dim)" }} />
          <span className="text-xs" style={{ color: "var(--ink-dim)" }}>
            Up to {RECENT_PRINTS_MAX} photos, compressed automatically like catalog photos. Captions are optional — one short line works best ("Dragon helmet, printed in silk bronze").
          </span>
        </label>
        {uploadingCount > 0 && <span className="text-xs mt-2" style={{ color: "var(--ink-dim)" }}>Preparing {uploadingCount} photo{uploadingCount === 1 ? "" : "s"}…</span>}

        {prints.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon={ImageIcon} title="No photos yet" body="Upload your first completed print above — the wall appears on the home page as soon as this is saved." />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {prints.map(function (p, i) {
              return (
                <div key={p.id} className="p-3 rounded-md flex gap-3" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
                  <img src={p.image} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                  <div className="flex flex-col gap-2 flex-1" style={{ minWidth: 0 }}>
                    <input
                      value={p.caption || ""}
                      onChange={function (e) { patchPrint(p.id, { caption: e.target.value }); }}
                      placeholder="Caption (optional)"
                      className="px-3 py-2 rounded-md text-sm w-full"
                      style={{ background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--ink)" }}
                    />
                    <div className="flex items-center gap-1">
                      <button onClick={function () { movePrint(p.id, -1); }} disabled={i === 0} aria-label="Move earlier" className="cursor-pointer border-0 bg-transparent" style={{ color: i === 0 ? "var(--line)" : "var(--ink-dim)" }}><ChevronUp size={15} /></button>
                      <button onClick={function () { movePrint(p.id, 1); }} disabled={i === prints.length - 1} aria-label="Move later" className="cursor-pointer border-0 bg-transparent" style={{ color: i === prints.length - 1 ? "var(--line)" : "var(--ink-dim)" }}><ChevronDown size={15} /></button>
                      <span className="text-xs font-mono-ac" style={{ color: "var(--ink-dim)", marginLeft: 4 }}>{i + 1}</span>
                      <button onClick={function () { removePrint(p.id); }} aria-label="Remove photo" className="cursor-pointer border-0 bg-transparent" style={{ color: "var(--danger)", marginLeft: "auto" }}><Trash2 size={15} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {savedMsg && <p className="text-sm" style={{ color: "var(--teal)" }}>{savedMsg}</p>}
      <PrimaryButton onClick={handleSave}>Save and publish</PrimaryButton>
    </div>
  );
}

function AdminSettings(props) {
  var settings = props.settings;
  var security = settings.security || DEFAULT_SECURITY;
  var pricing = settings.pricing || DEFAULT_SETTINGS.pricing;
  var _webhookUrl = React.useState(settings.webhookUrl || ""); var webhookUrl = _webhookUrl[0]; var setWebhookUrl = _webhookUrl[1];
  // The saved webhook URL itself never reaches the browser — only this
  // yes/no flag does. Tracked locally too, so the UI updates the moment
  // the owner saves one.
  var _webhookSet = React.useState(!!settings._webhookSet); var webhookSet = _webhookSet[0]; var setWebhookSet = _webhookSet[1];
  var _pingSent = React.useState(false); var pingSent = _pingSent[0]; var setPingSent = _pingSent[1];
  var _comboBuilder = React.useState([]); var comboBuilder = _comboBuilder[0]; var setComboBuilder = _comboBuilder[1];
  var _triggerClicks = React.useState(security.triggerClicks); var triggerClicks = _triggerClicks[0]; var setTriggerClicks = _triggerClicks[1];
  var _passcode = React.useState(""); var passcode = _passcode[0]; var setPasscode = _passcode[1];
  var _showPasscode = React.useState(false); var showPasscode = _showPasscode[0]; var setShowPasscode = _showPasscode[1];
  var _secMsg = React.useState(""); var secMsg = _secMsg[0]; var setSecMsg = _secMsg[1];
  var _savingPasscode = React.useState(false); var savingPasscode = _savingPasscode[0]; var setSavingPasscode = _savingPasscode[1];
  var _electricityRate = React.useState(pricing.electricityRate); var electricityRate = _electricityRate[0]; var setElectricityRate = _electricityRate[1];
  var _plaPricePerGram = React.useState(pricing.plaPricePerGram); var plaPricePerGram = _plaPricePerGram[0]; var setPlaPricePerGram = _plaPricePerGram[1];
  var _machineWearRate = React.useState(pricing.machineWearRate); var machineWearRate = _machineWearRate[0]; var setMachineWearRate = _machineWearRate[1];
  var _laborRate = React.useState(pricing.laborRate); var laborRate = _laborRate[0]; var setLaborRate = _laborRate[1];
  var _pricingMsg = React.useState(""); var pricingMsg = _pricingMsg[0]; var setPricingMsg = _pricingMsg[1];

  function flashSec(msg) {
    setSecMsg(msg);
    setTimeout(function () { setSecMsg(""); }, 2500);
  }
  function pressBuilderShape(shape) {
    setComboBuilder(function (prev) { return prev.length >= 6 ? prev : prev.concat([shape]); });
  }
  function saveCombo() {
    if (comboBuilder.length < 3) return;
    props.updateSettings(function (prev) {
      var next = Object.assign({}, prev);
      next.security = Object.assign({}, prev.security || DEFAULT_SECURITY, { combo: comboBuilder });
      return next;
    });
    setComboBuilder([]);
    flashSec("Combination updated.");
  }
  function saveTrigger() {
    props.updateSettings(function (prev) {
      var next = Object.assign({}, prev);
      next.security = Object.assign({}, prev.security || DEFAULT_SECURITY, { triggerClicks: Number(triggerClicks) || 5 });
      return next;
    });
    flashSec("Click count updated.");
  }
  function savePasscode() {
    var value = (passcode || "").trim();
    if (!value) return;
    if (value.length < 12) { flashSec("New passcode must be at least 12 characters."); return; }
    if (value.toLowerCase() === "voxel-owner") { flashSec("That's the well-known default passcode — please choose your own."); return; }
    setSavingPasscode(true);
    sha256(value).then(function (hash) {
      setSavingPasscode(false);
      props.updateSettings(function (prev) {
        var next = Object.assign({}, prev);
        // _updatePasscode tells the server this hash is an intentional
        // change — without it the server preserves the stored one,
        // because the dashboard never receives the current hash back
        // (it's stripped from public reads for safety).
        next.security = Object.assign({}, prev.security || DEFAULT_SECURITY, { passcodeHash: hash, _updatePasscode: true });
        return next;
      });
      setPasscode("");
      flashSec("Passcode updated.");
    });
  }
  function saveWebhook() {
    props.updateSettings(function (prev) {
      var next = Object.assign({}, prev);
      // _updateWebhook tells the server this URL is an intentional
      // change — the current URL is never sent back to the browser,
      // so the server preserves it unless this flag is set.
      next._updateWebhook = true;
      next.webhookUrl = webhookUrl;
      return next;
    });
    setWebhookSet(true);
    setWebhookUrl("");
    flashSec("Webhook saved — it stays hidden from the site.");
  }
  function savePricing() {
    props.updateSettings(function (prev) {
      var next = Object.assign({}, prev);
      next.pricing = {
        electricityRate: Math.max(0, Number(electricityRate) || 0),
        plaPricePerGram: Math.max(0, Number(plaPricePerGram) || 0),
        machineWearRate: Math.max(0, Number(machineWearRate) || 0),
        laborRate: Math.max(0, Number(laborRate) || 0),
      };
      return next;
    });
    setPricingMsg("Saved — new models will use these rates from now on. Anything already in your catalog keeps its existing price.");
    setTimeout(function () { setPricingMsg(""); }, 4000);
  }
  function testPing() {
    apiPingDiscord("This is a test ping from your website.").then(function (ok) {
      setPingSent(ok);
      setTimeout(function () { setPingSent(false); }, 3000);
    });
  }

  return (
    <div className="flex flex-col gap-12 max-w-xl">
      <section>
        <h3 className="font-display text-lg mb-2" style={{ color: "var(--ink)" }}>Owner entry security</h3>
        <p className="text-sm mb-4" style={{ color: "var(--ink-dim)" }}>
          To get in: click your business name in the footer {security.triggerClicks} times quickly, enter the combination, then the passcode. Change any of the three below.
        </p>

        <div className="mb-6">
          <div className="text-sm mb-2" style={{ color: "var(--ink)" }}>Footer clicks needed</div>
          <div className="flex gap-2">
            <input type="number" min={3} max={10} value={triggerClicks} onChange={function (e) { setTriggerClicks(e.target.value); }} className="w-24 px-3 py-2 rounded-md text-sm" style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }} />
            <SecondaryButton onClick={saveTrigger}>Save</SecondaryButton>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-sm mb-2" style={{ color: "var(--ink)" }}>Current combination</div>
          <div className="flex items-center gap-2 mb-3">
            {security.combo.map(function (s, i) {
              return (
                <span key={i} className="rounded-md flex items-center justify-center" style={{ width: 34, height: 34, background: "var(--panel)", border: "1px solid var(--line)" }}>
                  <ShapeIcon shape={s} />
                </span>
              );
            })}
          </div>
          <div className="text-xs mb-2" style={{ color: "var(--ink-dim)" }}>Tap shapes below in the new order you want (3 to 6 taps), then save.</div>
          <div className="flex items-center gap-2 mb-2">
            {COMBO_SHAPES.map(function (shape) {
              return (
                <button type="button" key={shape} onClick={function () { pressBuilderShape(shape); }} className="cursor-pointer rounded-md" style={{ width: 34, height: 34, background: "var(--panel)", border: "1px solid var(--line)" }}>
                  <ShapeIcon shape={shape} />
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mb-3" style={{ minHeight: 28 }}>
            {comboBuilder.map(function (s, i) {
              return (
                <span key={i} className="rounded-md flex items-center justify-center" style={{ width: 28, height: 28, background: "var(--brass-soft)", border: "1px solid var(--brass)" }}>
                  <ShapeIcon shape={s} size={16} />
                </span>
              );
            })}
          </div>
          <div className="flex gap-2">
            <SecondaryButton onClick={function () { setComboBuilder([]); }} disabled={comboBuilder.length === 0}>Clear</SecondaryButton>
            <PrimaryButton onClick={saveCombo} disabled={comboBuilder.length < 3}>Save combination</PrimaryButton>
          </div>
        </div>

        <div>
          <div className="text-sm mb-2" style={{ color: "var(--ink)" }}>Passcode</div>
          <p className="text-xs mb-2" style={{ color: "var(--ink-dim)" }}>
            For security your current passcode is never stored in a readable form — only a one-way hash of it is kept, so it can't be shown here. Enter a new passcode below to change it.
          </p>
          <div className="flex gap-2">
            <input
              type={showPasscode ? "text" : "password"}
              value={passcode}
              onChange={function (e) { setPasscode(e.target.value); }}
              placeholder="New passcode"
              autoComplete="off"
              className="flex-1 px-3 py-2 rounded-md text-sm"
              style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }}
            />
            <button type="button" onClick={function () { setShowPasscode(function (s) { return !s; }); }} className="cursor-pointer rounded-md flex items-center justify-center" style={{ width: 42, background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-dim)" }}>
              {showPasscode ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <SecondaryButton onClick={savePasscode} disabled={savingPasscode || !passcode.trim()}>{savingPasscode ? "Saving…" : "Save"}</SecondaryButton>
          </div>
        </div>
        {secMsg && <p className="text-xs mt-3" style={{ color: "var(--teal)" }}>{secMsg}</p>}
      </section>

      <section>
        <h3 className="font-display text-lg mb-2" style={{ color: "var(--ink)" }}>Get notified in Discord</h3>
        <p className="text-sm mb-3" style={{ color: "var(--ink-dim)" }}>
          Paste a Discord webhook link to get pinged there whenever someone taps Order now. In Discord: Server Settings → Integrations → Webhooks → New Webhook → Copy URL. The link is stored on the server only — visitors can never see, spam, or delete it.
        </p>
        {(webhookSet || webhookUrl) && (
          <p className="text-xs mb-2 font-mono-ac" style={{ color: "var(--teal)" }}>
            {webhookSet ? "A webhook is saved and hidden. Paste a new link below to replace it, or test it as-is." : ""}
          </p>
        )}
        <div className="flex gap-2">
          <input value={webhookUrl} onChange={function (e) { setWebhookUrl(e.target.value); }} placeholder={webhookSet ? "Saved — paste a new link to replace" : "https://discord.com/api/webhooks/..."} className="flex-1 px-3.5 py-2.5 rounded-md text-sm font-mono-ac" style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }} />
          <SecondaryButton onClick={saveWebhook} disabled={!webhookUrl.trim()}>Save</SecondaryButton>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <SecondaryButton onClick={testPing} icon={Send}>Send test ping</SecondaryButton>
          {pingSent && <span className="text-xs" style={{ color: "var(--teal)" }}>Sent — check Discord.</span>}
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg mb-2" style={{ color: "var(--ink)" }}>Print pricing calculator</h3>
        <p className="text-sm mb-4" style={{ color: "var(--ink-dim)" }}>
          When you fill in a model's filament weight and print time (in Catalog, or when importing several at once), the price gets calculated automatically from the rates below — always as PLA. Changing these only affects models you add from now on; anything already in your catalog keeps whatever price it already has.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
            Electricity rate ($/kWh)
            <input type="number" min={0} step="0.01" value={electricityRate} onChange={function (e) { setElectricityRate(e.target.value); }} className="px-3 py-2 rounded-md text-sm" style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
            PLA price ($ per gram)
            <input type="number" min={0} step="0.001" value={plaPricePerGram} onChange={function (e) { setPlaPricePerGram(e.target.value); }} className="px-3 py-2 rounded-md text-sm" style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
            Machine wear ($/hour)
            <input type="number" min={0} step="0.1" value={machineWearRate} onChange={function (e) { setMachineWearRate(e.target.value); }} className="px-3 py-2 rounded-md text-sm" style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
            Your own time ($/hour)
            <input type="number" min={0} step="0.1" value={laborRate} onChange={function (e) { setLaborRate(e.target.value); }} className="px-3 py-2 rounded-md text-sm" style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }} />
          </label>
        </div>
        <p className="text-xs mb-3" style={{ color: "var(--ink-dim)" }}>
          PLA price tip: spool price ÷ spool weight in grams — e.g. a $20, 1kg spool is $20 ÷ 1000 = 0.02.
        </p>
        <SecondaryButton onClick={savePricing}>Save pricing</SecondaryButton>
        {pricingMsg && <p className="text-xs mt-3" style={{ color: "var(--teal)" }}>{pricingMsg}</p>}
      </section>
    </div>
  );
}

function AdminView(props) {
  var content = props.content;
  var tabs = [
    { id: "orders", label: "Inquiries", icon: ClipboardList },
    { id: "catalog", label: "Catalog", icon: Layers },
    { id: "prints", label: "Prints wall", icon: ImageIcon },
    { id: "content", label: "Content", icon: TypeIcon },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];
  return (
    <div className="voxel-admin-view max-w-6xl mx-auto px-5 sm:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Eyebrow>Owner dashboard</Eyebrow>
          <h2 className="font-display text-2xl" style={{ color: "var(--ink)" }}>{content.businessName} dashboard</h2>
        </div>
        <SecondaryButton onClick={props.goHome}>View shop</SecondaryButton>
      </div>

      <div className="flex gap-2 mb-8 flex-wrap" style={{ borderBottom: "1px solid var(--line)" }}>
        {tabs.map(function (t) {
          var TabIcon = t.icon;
          return (
            <button key={t.id} onClick={function () { props.setTab(t.id); }} className="flex items-center gap-2 px-4 py-3 text-sm cursor-pointer border-0"
              style={{ background: "transparent", color: props.tab === t.id ? "var(--ink)" : "var(--ink-dim)", borderBottom: props.tab === t.id ? "2px solid var(--brass)" : "2px solid transparent" }}>
              <TabIcon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {props.tab === "orders" && <AdminInquiries inquiries={props.inquiries} />}
      {props.tab === "catalog" && (
        <AdminCatalog categories={props.categories} models={props.models} addCategory={props.addCategory} renameCategory={props.renameCategory} deleteCategory={props.deleteCategory}
          addModel={props.addModel} updateModel={props.updateModel} deleteModel={props.deleteModel} toggleFeatured={props.toggleFeatured} importModels={props.importModels} content={content} settings={props.settings} />
      )}
      {props.tab === "content" && <AdminContent content={content} updateContent={props.updateContent} />}
      {props.tab === "prints" && <AdminPrintsWall content={props.content} updateContent={props.updateContent} />}
      {props.tab === "settings" && <AdminSettings settings={props.settings} updateSettings={props.updateSettings} />}
    </div>
  );
}
