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
    sha256(pw).then(function (hash) {
      setChecking(false);
      if (hash === sec.passcodeHash) {
        setPw("");
        props.onSuccess();
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

  return (
    <div className="max-w-sm mx-auto px-5 py-24 text-center">
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
        if (d.title) { setName(d.title); gotAnything = true; }
        if (d.description) { setDescription(d.description); gotAnything = true; }
        if (d.image && d.image.url) { setImage(d.image.url); gotAnything = true; }
        if (!gotAnything) throw new Error("empty");
        setFetchedOk(true);
      })
      .catch(function () {
        setFetchError("Could not read that link — paste the details in by hand instead.");
      })
      .finally(function () { setFetching(false); });
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
    props.onSave({ id: model.id, name: name.trim(), description: description.trim(), price: price, categoryId: categoryId, image: image, featured: featured });
  }

  return (
    <div className="p-5 rounded-lg mb-4 flex flex-col gap-4" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>
      <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
        Paste a link to auto-fill (MakerWorld, Printables, etc.)
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
        <span className="text-xs" style={{ color: "var(--teal)" }}>Filled in below — check it over, then set a price and category.</span>
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
    var toAdd = [];
    var skippedErrors = 0;
    var skippedNoCategory = 0;

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
        toAdd.push({
          id: entry.id || makeId("model"),
          name: String(entry.name).trim(),
          description: (entry.description || "").trim(),
          price: entry.price || "",
          categoryId: categoryId,
          image: compressedImage,
          featured: !!entry.featured,
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
        if (skippedErrors > 0) parts.push(skippedErrors + " skipped (fetch errors or missing name).");
        if (skippedNoCategory > 0) parts.push(skippedNoCategory + " skipped (unrecognized category).");
        setImportSummary(parts.join(" "));
      });
    }

    processNext();
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
                <button onClick={function () { props.toggleFeatured(m.id); }} className="cursor-pointer border-0 bg-transparent" style={{ color: m.featured ? "var(--brass-text)" : "var(--ink-dim)" }}>
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

  var inputStyle = { background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" };
  function Field(fieldProps) {
    var label = fieldProps.label, field = fieldProps.field, area = fieldProps.area, placeholder = fieldProps.placeholder;
    return (
      <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
        {label}
        {area ? (
          <textarea value={draft[field]} onChange={function (e) { set(field, e.target.value); }} rows={2} placeholder={placeholder} className="px-3 py-2 rounded-md text-sm resize-none" style={inputStyle} />
        ) : (
          <input value={draft[field]} onChange={function (e) { set(field, e.target.value); }} placeholder={placeholder} className="px-3 py-2 rounded-md text-sm" style={inputStyle} />
        )}
      </label>
    );
  }

  return (
    <div className="flex flex-col gap-10 max-w-2xl">
      <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
        Everything below is yours to rewrite. Nothing changes for visitors until you press "Save and publish" at the bottom.
      </p>

      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>Identity</h3>
        <div className="flex flex-col gap-4">
          <Field label="Business name" field="businessName" />
          <Field label="Currency symbol" field="currencySymbol" />
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
          <Field label="WhatsApp number (digits only, with country code — e.g. 9613123456, no plus or spaces)" field="whatsappNumber" placeholder="9613123456" />
          <Field label="Instagram username (no @)" field="instagramHandle" placeholder="yourbusiness" />
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>Contact information (shown on the site)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Phone" field="contactPhone" placeholder="+961 ..." />
          <Field label="Email" field="contactEmail" placeholder="you@example.com" />
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>Home page</h3>
        <div className="flex flex-col gap-4">
          <Field label="Eyebrow (small line above the headline, after your business name)" field="heroEyebrow" />
          <Field label="Headline — line 1" field="heroHeadlineLine1" />
          <Field label="Headline — line 2" field="heroHeadlineLine2" />
          <Field label="Subtext" field="heroSubtext" area />
          <Field label="Featured section label" field="featuredEyebrow" />
          <Field label="Categories section label" field="categoriesEyebrow" />
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>Custom-order card (on the home page)</h3>
        <div className="flex flex-col gap-4">
          <Field label="Heading" field="customCtaHeading" />
          <Field label="Body" field="customCtaBody" area />
          <Field label="Button text" field="customCtaButton" />
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>Custom order page</h3>
        <div className="flex flex-col gap-4">
          <Field label="Heading" field="customPageHeading" />
          <Field label="Subtext" field="customPageSubtext" area />
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>Empty category message</h3>
        <div className="flex flex-col gap-4">
          <Field label="Title" field="emptyCategoryTitle" />
          <Field label="Body" field="emptyCategoryBody" area />
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>Footer</h3>
        <Field label="Tagline (shown right after your business name)" field="footerTagline" />
      </section>

      <section>
        <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink)" }}>Pricing display</h3>
        <label className="flex items-center gap-2 text-sm cursor-pointer mb-3" style={{ color: "var(--ink)" }}>
          <input type="checkbox" checked={draft.showLbpConversion} onChange={function (e) { set("showLbpConversion", e.target.checked); }} />
          Also show prices converted to Lebanese Lira
        </label>
        {draft.showLbpConversion && <Field label="Exchange rate (LBP per $1)" field="lbpExchangeRate" />}
      </section>

      {savedMsg && <p className="text-sm" style={{ color: "var(--teal)" }}>{savedMsg}</p>}
      <PrimaryButton onClick={handleSave}>Save and publish</PrimaryButton>
    </div>
  );
}

function AdminSettings(props) {
  var settings = props.settings;
  var security = settings.security || DEFAULT_SECURITY;
  var _webhookUrl = React.useState(settings.webhookUrl || ""); var webhookUrl = _webhookUrl[0]; var setWebhookUrl = _webhookUrl[1];
  var _pingSent = React.useState(false); var pingSent = _pingSent[0]; var setPingSent = _pingSent[1];
  var _comboBuilder = React.useState([]); var comboBuilder = _comboBuilder[0]; var setComboBuilder = _comboBuilder[1];
  var _triggerClicks = React.useState(security.triggerClicks); var triggerClicks = _triggerClicks[0]; var setTriggerClicks = _triggerClicks[1];
  var _passcode = React.useState(""); var passcode = _passcode[0]; var setPasscode = _passcode[1];
  var _showPasscode = React.useState(false); var showPasscode = _showPasscode[0]; var setShowPasscode = _showPasscode[1];
  var _secMsg = React.useState(""); var secMsg = _secMsg[0]; var setSecMsg = _secMsg[1];
  var _savingPasscode = React.useState(false); var savingPasscode = _savingPasscode[0]; var setSavingPasscode = _savingPasscode[1];

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
    if (!passcode.trim()) return;
    setSavingPasscode(true);
    sha256(passcode.trim()).then(function (hash) {
      setSavingPasscode(false);
      props.updateSettings(function (prev) {
        var next = Object.assign({}, prev);
        next.security = Object.assign({}, prev.security || DEFAULT_SECURITY, { passcodeHash: hash });
        return next;
      });
      setPasscode("");
      flashSec("Passcode updated.");
    });
  }
  function saveWebhook() {
    props.updateSettings(function (prev) { var next = Object.assign({}, prev); next.webhookUrl = webhookUrl; return next; });
  }
  function testPing() {
    pingDiscord(webhookUrl, "This is a test ping from your website.").then(function () {
      setPingSent(true);
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
          Paste a Discord webhook link to get pinged there whenever someone taps Order now. In Discord: Server Settings → Integrations → Webhooks → New Webhook → Copy URL.
        </p>
        <div className="flex gap-2">
          <input value={webhookUrl} onChange={function (e) { setWebhookUrl(e.target.value); }} placeholder="https://discord.com/api/webhooks/..." className="flex-1 px-3.5 py-2.5 rounded-md text-sm font-mono-ac" style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }} />
          <SecondaryButton onClick={saveWebhook}>Save</SecondaryButton>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <SecondaryButton onClick={testPing} icon={Send}>Send test ping</SecondaryButton>
          {pingSent && <span className="text-xs" style={{ color: "var(--teal)" }}>Sent — check Discord.</span>}
        </div>
      </section>
    </div>
  );
}

function AdminView(props) {
  var content = props.content;
  var tabs = [
    { id: "orders", label: "Inquiries", icon: ClipboardList },
    { id: "catalog", label: "Catalog", icon: Layers },
    { id: "content", label: "Content", icon: TypeIcon },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];
  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
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
          addModel={props.addModel} updateModel={props.updateModel} deleteModel={props.deleteModel} toggleFeatured={props.toggleFeatured} importModels={props.importModels} content={content} />
      )}
      {props.tab === "content" && <AdminContent content={content} updateContent={props.updateContent} />}
      {props.tab === "settings" && <AdminSettings settings={props.settings} updateSettings={props.updateSettings} />}
    </div>
  );
}
