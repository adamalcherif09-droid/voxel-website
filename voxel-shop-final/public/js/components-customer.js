function Header(props) {
  var content = props.content;
  return (
    <header style={{ background: "var(--canvas)", borderBottom: "1px solid var(--line)" }} className="sticky top-0 z-30">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-5 sm:px-8 py-4">
        <button onClick={props.goHome} className="voxel-brand flex items-center gap-2 bg-transparent border-0 cursor-pointer" aria-label={content.businessName + " home"}>
          {content.logoImage ? (
            <img src={content.logoImage} alt={content.businessName} style={{ height: 60, width: "auto" }} />
          ) : (
            <BrandMark />
          )}
          <span className="font-display text-xl tracking-tight" style={{ color: "var(--ink)", marginLeft: "-2px" }}>{content.businessName}</span>
        </button>
        <nav className="flex items-center gap-3 sm:gap-4">
          <button onClick={props.goCustom} className="glass-accent tint-brass voxel-magnetic voxel-tilt flex items-center gap-1.5 px-3.5 py-2 rounded-md border-0 cursor-pointer text-sm font-medium" style={{ color: "#161618" }}>
            <UploadCloud size={16} />
            <span className="hidden sm:inline">Custom print</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

function Footer(props) {
  var content = props.content;
  var sec = props.security || DEFAULT_SECURITY;
  var clickState = React.useRef({ count: 0, last: 0 });
  function handleSecretClick() {
    var now = Date.now();
    var st = clickState.current;
    if (now - st.last > 1200) st.count = 0;
    st.count += 1;
    st.last = now;
    if (st.count >= sec.triggerClicks) {
      st.count = 0;
      props.onTrigger();
    }
  }
  var mailtoUrl = buildMailtoUrl(content.contactEmail);
  // The phone number in the footer opens a WhatsApp chat instead of the
  // phone's dialer — that's how customers actually want to reach out.
  // Prefers the dedicated WhatsApp number if it's set, otherwise falls
  // back to the general contact phone number.
  var whatsappDisplayNumber = content.contactPhone || content.whatsappNumber;
  var whatsappFooterUrl = buildWhatsAppUrl(content.whatsappNumber || content.contactPhone, "Hi! I have a question.");
  var instagramUrl = buildInstagramDmUrl(content.instagramHandle);
  var tiktokUrl = buildTiktokUrl(content.tiktokHandle);
  var facebookUrl = buildFacebookUrl(content.facebookHandle);
  var hasAnything = content.contactEmail || whatsappDisplayNumber || instagramUrl || tiktokUrl || facebookUrl;
  return (
    <footer className="mt-20 liquid-glass">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm" style={{ color: "var(--ink-dim)" }}>
        <span onClick={handleSecretClick} style={{ cursor: "default", userSelect: "none" }}>
          {content.businessName} — {content.footerTagline}
        </span>
        {hasAnything && (
          <div className="footer-contacts flex flex-wrap items-center gap-x-4 gap-y-1 font-mono-ac text-xs">
            {content.contactEmail && (mailtoUrl ? <a href={mailtoUrl} style={{ color: "inherit", textDecoration: "none" }}>{content.contactEmail}</a> : content.contactEmail)}
            {whatsappDisplayNumber && (whatsappFooterUrl ? <a href={whatsappFooterUrl} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>{whatsappDisplayNumber}</a> : whatsappDisplayNumber)}
            {instagramUrl && <a href={instagramUrl} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}><Instagram size={14} />Instagram</a>}
            {tiktokUrl && <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>TikTok</a>}
            {facebookUrl && <a href={facebookUrl} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>Facebook</a>}
          </div>
        )}
      </div>
    </footer>
  );
}

function ModelCard(props) {
  var model = props.model;
  var content = props.content;
  return (
    <div
      onClick={props.onView}
      className={"voxel-tilt rounded-lg overflow-hidden flex flex-col cursor-pointer"}
      style={{ background: "var(--panel)", border: props.highlight ? "1px solid var(--brass)" : "1px solid var(--line)" }}
    >
      <div className="flex items-center justify-center" style={{ background: "var(--panel-2)", minHeight: model.image ? undefined : 140 }}>
        {model.image ? (
          <img src={model.image} alt={model.name} style={{ width: "100%", height: "auto", display: "block" }} />
        ) : (
          <ImageIcon size={26} style={{ color: "var(--ink-dim)" }} />
        )}
      </div>
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="font-display text-sm sm:text-base" style={{ color: "var(--ink)" }}>{model.name}</div>
          {model.featured && <Star size={14} fill="var(--brass-text)" style={{ color: "var(--brass-text)" }} />}
        </div>
        <div className="flex items-center justify-between mt-3 gap-2">
          <span className="font-mono-ac text-xs sm:text-sm" style={{ color: "var(--ink)" }}>
            {model.price ? formatPriceDisplay(model.price, content) : "Ask for price"}
          </span>
          <button
            onClick={function (e) { e.stopPropagation(); props.onOrder(); }}
            className="liquid-glass tint-teal voxel-tilt text-xs sm:text-sm font-medium px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-md cursor-pointer border-0"
            style={{ color: "var(--canvas)" }}
          >
            Order now
          </button>
        </div>
      </div>
    </div>
  );
}

function HomeView(props) {
  var content = props.content;
  var categories = props.categories;
  var models = props.models;
  var featured = models.filter(function (m) { return m.featured; });

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8">
      <section className="pt-14 sm:pt-20 pb-10 voxel-hero">
        <div className="voxel-hero-fx" aria-hidden="true"></div>
        <Eyebrow>{content.businessName} — {content.heroEyebrow}</Eyebrow>
        <h1 className="voxel-reveal font-display font-medium leading-tight" style={{ color: "var(--ink)", fontSize: "clamp(2.2rem, 5vw, 3.4rem)" }}>
          {content.heroHeadlineLine1}<br />{content.heroHeadlineLine2}
        </h1>
        <p className="voxel-fade mt-5 max-w-lg text-base sm:text-lg" style={{ color: "var(--ink-dim)" }}>
          {content.heroSubtext}
        </p>
      </section>

      {featured.length > 0 && (
        <section className="pb-14">
          <Eyebrow>{content.featuredEyebrow}</Eyebrow>
          <div className="voxel-masonry">
            {featured.map(function (m) {
              return (
                <div key={m.id} className="voxel-masonry-item">
                  <ModelCard model={m} content={content} onOrder={function () { props.onOrderModel(m); }} onView={function () { props.onViewModel(m); }} highlight />
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="pb-14">
        <Eyebrow>{content.categoriesEyebrow}</Eyebrow>
        <div className="cat-shelf liquid-glass grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <button
            onClick={function () { props.goCategory(ALL_DESIGNS_CATEGORY); }}
            className="glass-accent tint-brass cat-tile-accent col-span-2 text-left p-5 cursor-pointer border-0"
          >
            <Layers size={20} style={{ color: "var(--brass-text)" }} />
            <div className="font-display text-lg mt-3" style={{ color: "var(--ink)" }}>All Designs</div>
            <div className="text-xs mt-1 font-mono-ac" data-countup style={{ color: "var(--ink-dim)" }}>
              {models.length > 0 ? (models.length + " " + (models.length === 1 ? "design" : "designs")) : "Coming soon"}
            </div>
          </button>
          {categories.map(function (c) {
            var count = models.filter(function (m) { return m.categoryId === c.id; }).length;
            return (
              <button key={c.id} onClick={function () { props.goCategory(c); }} className="glass-accent cat-tile-accent text-left p-5 cursor-pointer border-0">
                <Layers size={18} style={{ color: "var(--brass-text)" }} />
                <div className="font-display text-base mt-3" style={{ color: "var(--ink)" }}>{c.name}</div>
                <div className="text-xs mt-1 font-mono-ac" style={{ color: "var(--ink-dim)" }}>
                  {count > 0 ? (count + " " + (count === 1 ? "design" : "designs")) : "Coming soon"}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="pb-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 p-6 sm:p-8 rounded-lg" style={{ border: "1px dashed var(--brass)", background: "rgba(230, 219, 211, 0.62)" }}>
          <div>
            <div className="font-display text-lg" style={{ color: "var(--ink)" }}>{content.customCtaHeading}</div>
            <p className="text-sm mt-1 max-w-md" style={{ color: "var(--ink-dim)" }}>{content.customCtaBody}</p>
          </div>
          <PrimaryButton onClick={props.goCustom} icon={UploadCloud}>{content.customCtaButton}</PrimaryButton>
        </div>
      </section>
    </div>
  );
}

function CategoryView(props) {
  var content = props.content;
  var category = props.category;
  var models = props.models;
  // The virtual "All Designs" category shows every model, regardless
  // of which real category it's actually filed under.
  var items = category.id === ALL_DESIGNS_CATEGORY_ID
    ? models
    : models.filter(function (m) { return m.categoryId === category.id; });

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
      <button onClick={props.goBack} className="flex items-center gap-1.5 text-sm mb-6 bg-transparent border-0 cursor-pointer" style={{ color: "var(--ink-dim)" }}>
        <ChevronLeft size={16} /> Back
      </button>
      <Eyebrow>Category</Eyebrow>
      <h2 className="font-display text-2xl sm:text-3xl mb-8" style={{ color: "var(--ink)" }}>{category.name}</h2>
      {items.length === 0 ? (
        <EmptyState icon={Package} title={content.emptyCategoryTitle} body={content.emptyCategoryBody} />
      ) : (
        <div className="voxel-masonry">
          {items.map(function (m) {
            return (
              <div key={m.id} className="voxel-masonry-item">
                <ModelCard model={m} content={content} onOrder={function () { props.onOrderModel(m); }} onView={function () { props.onViewModel(m); }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CustomOrderView(props) {
  var content = props.content;
  var _file = React.useState(null); var file = _file[0]; var setFile = _file[1];
  var _fileError = React.useState(""); var fileError = _fileError[0]; var setFileError = _fileError[1];
  var _notes = React.useState(""); var notes = _notes[0]; var setNotes = _notes[1];
  var _error = React.useState(""); var error = _error[0]; var setError = _error[1];

  function handleFile(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!isAllowedFile(f.name)) {
      setFileError("That file type is not supported — upload an STL, 3MF, STEP, or OBJ file, anything you can open in Bambu Studio.");
      setFile(null);
      e.target.value = "";
      return;
    }
    setFileError("");
    setFile({ name: f.name, size: f.size });
  }

  function handleSubmit() {
    if (!file) {
      setError("Attach your file first.");
      return;
    }
    setError("");
    props.onOrderNow({ fileName: file.name, note: notes.trim() });
  }

  var hasContact = content.contactPhone || content.contactEmail || content.whatsappNumber;

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 py-10">
      <button onClick={props.goBack} className="flex items-center gap-1.5 text-sm mb-6 bg-transparent border-0 cursor-pointer" style={{ color: "var(--ink-dim)" }}>
        <ChevronLeft size={16} /> Back
      </button>
      <Eyebrow>Custom order</Eyebrow>
      <h2 className="font-display text-2xl" style={{ color: "var(--ink)" }}>{content.customPageHeading}</h2>
      <p className="text-sm mt-2 max-w-md" style={{ color: "var(--ink-dim)" }}>{content.customPageSubtext}</p>
      {hasContact && (
        <p className="text-xs mt-2 font-mono-ac" style={{ color: "var(--ink-dim)" }}>
          Or reach us directly — {content.contactEmail && (buildMailtoUrl(content.contactEmail) ? <a href={buildMailtoUrl(content.contactEmail)} style={{ color: "inherit" }}>{content.contactEmail}</a> : content.contactEmail)}{content.contactEmail && (content.contactPhone || content.whatsappNumber) ? " · " : ""}{(content.contactPhone || content.whatsappNumber) && (buildWhatsAppUrl(content.whatsappNumber || content.contactPhone, "Hi! I have a question.") ? <a href={buildWhatsAppUrl(content.whatsappNumber || content.contactPhone, "Hi! I have a question.")} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>{content.contactPhone || content.whatsappNumber}</a> : (content.contactPhone || content.whatsappNumber))}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-6">
        <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
          Your file
          <div className="flex items-center gap-3 p-4 rounded-md" style={{ border: "1px dashed var(--line)" }}>
            <UploadCloud size={18} style={{ color: "var(--ink-dim)" }} />
            <input type="file" accept=".stl,.3mf,.step,.stp,.obj" onChange={handleFile} className="text-sm" style={{ color: "var(--ink-dim)" }} />
          </div>
          {file && <span className="text-xs font-mono-ac" style={{ color: "var(--ink-dim)" }}>{file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB</span>}
          {fileError && <span className="text-xs" style={{ color: "var(--danger)" }}>{fileError}</span>}
        </label>

        <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
          Anything we should know? (optional)
          <textarea value={notes} onChange={function (e) { setNotes(e.target.value); }} rows={3} placeholder="Color, material, size, quantity — whatever matters to you." className="px-3.5 py-2.5 rounded-md text-sm resize-none" style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }} />
        </label>

        {error && <div className="text-sm" style={{ color: "var(--danger)" }}>{error}</div>}

        <PrimaryButton onClick={handleSubmit}>Order now</PrimaryButton>
        <p className="text-xs" style={{ color: "var(--ink-dim)" }}>You will pick WhatsApp or Instagram next, and can attach the file once the chat opens.</p>
      </div>
    </div>
  );
}

function ModelDetailPopup(props) {
  var model = props.model;
  var content = props.content;
  return (
    <div
      onClick={props.onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(22,22,24,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}
    >
      <div
        onClick={function (e) { e.stopPropagation(); }}
        style={{ background: "var(--panel)", borderRadius: 16, maxWidth: 420, width: "100%", border: "1px solid var(--line)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        <div style={{ position: "relative", background: "var(--panel-2)" }}>
          <div className="flex items-center justify-center" style={{ aspectRatio: "1 / 1" }}>
            {model.image ? (
              <img src={model.image} alt={model.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <ImageIcon size={40} style={{ color: "var(--ink-dim)" }} />
            )}
          </div>
          <button
            onClick={props.onClose}
            className="liquid-glass liquid-glass--round voxel-tilt cursor-pointer border-0"
            aria-label="Close"
            style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, background: "rgba(22,22,24,0.35)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-3" style={{ overflowY: "auto" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="font-display text-lg" style={{ color: "var(--ink)" }}>{model.name}</div>
            {model.featured && <Star size={17} fill="var(--brass-text)" style={{ color: "var(--brass-text)" }} />}
          </div>
          {model.description && <p className="text-sm" style={{ color: "var(--ink-dim)" }}>{model.description}</p>}
          <div className="font-mono-ac text-base" style={{ color: "var(--ink)" }}>
            {model.price ? formatPriceDisplay(model.price, content) : "Ask for price"}
          </div>
          <PrimaryButton onClick={props.onOrder}>Order now</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function OrderContactPopup(props) {
  var content = props.content;
  var item = props.item;
  var _copied = React.useState(false); var copied = _copied[0]; var setCopied = _copied[1];
  var _copyFailed = React.useState(false); var copyFailed = _copyFailed[0]; var setCopyFailed = _copyFailed[1];
  var textRef = React.useRef(null);
  var isCustom = item.type === "custom";
  // WhatsApp and Instagram links can only pre-fill plain text — there is
  // no way to attach the actual photo through them. Instead, for a
  // catalog item, the message includes a link back to that exact model
  // on the site, so opening it shows the name, price, and photo.
  var modelLink = !isCustom && item.id ? (window.location.origin + "/?model=" + encodeURIComponent(item.id)) : "";
  var message = isCustom
    ? "Hi! I have a custom design I would like printed." + (item.fileName ? " File: " + item.fileName + "." : "") + (item.note ? " " + item.note : "")
    : "Hi! I would like to order: " + item.name + (modelLink ? " — " + modelLink : "");
  var waUrl = buildWhatsAppUrl(content.whatsappNumber, message);
  var igUrl = buildInstagramDmUrl(content.instagramHandle);
  var hasAny = waUrl || igUrl;

  function handleWhatsAppClick() {
    props.onLogInquiry("whatsapp");
    props.onClose();
  }
  function handleInstagramClick() {
    props.onLogInquiry("instagram");
  }
  function copyMessage() {
    function fallback() {
      var ok = false;
      try {
        if (textRef.current) {
          textRef.current.focus();
          textRef.current.select();
          ok = document.execCommand("copy");
        }
      } catch (e2) { ok = false; }
      if (ok) {
        setCopied(true);
        setCopyFailed(false);
        setTimeout(function () { setCopied(false); }, 2000);
      } else {
        setCopyFailed(true);
        if (textRef.current) { textRef.current.focus(); textRef.current.select(); }
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(message).then(function () {
        setCopied(true);
        setCopyFailed(false);
        setTimeout(function () { setCopied(false); }, 2000);
      }, fallback);
    } else {
      fallback();
    }
  }

  return (
    <div
      onClick={props.onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(22,22,24,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}
    >
      <div onClick={function (e) { e.stopPropagation(); }} style={{ background: "var(--panel)", borderRadius: 16, padding: 28, maxWidth: 380, width: "100%", border: "1px solid var(--line)" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="font-display text-lg" style={{ color: "var(--ink)" }}>How would you like to order?</div>
          <button onClick={props.onClose} className="cursor-pointer border-0 bg-transparent" style={{ color: "var(--ink-dim)" }} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm mt-2" style={{ color: "var(--ink-dim)" }}>
          {isCustom ? "We will open a chat — attach your file once it opens." : "We will open a chat about \"" + item.name + "\"."}
        </p>

        <div className="flex flex-col gap-3 mt-5">
          {waUrl && (
            <div>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsAppClick}
                className="liquid-glass tint-brass voxel-tilt inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md text-sm font-medium w-full"
                style={{ color: "#161618", textDecoration: "none" }}
              >
                <MessageCircle size={16} />
                Message on WhatsApp
              </a>
              <p className="text-xs mt-1.5" style={{ color: "var(--ink-dim)" }}>
                If nothing opens: <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal)" }}>tap this link</a> instead.
              </p>
            </div>
          )}
          {igUrl && (
            <div>
              <a
                href={igUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleInstagramClick}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium w-full"
                style={{ background: "transparent", color: "var(--ink)", border: "1px solid var(--line)", textDecoration: "none" }}
              >
                <Instagram size={16} />
                Message on Instagram
              </a>
              <p className="text-xs mt-1.5" style={{ color: "var(--ink-dim)" }}>
                If nothing opens: <a href={igUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal)" }}>tap this link</a> instead.
              </p>
              <p className="text-xs mt-2" style={{ color: "var(--ink-dim)" }}>Instagram cannot pre-fill the message. Copy it below and paste it once the chat opens:</p>
              <div className="flex items-center gap-2 mt-2">
                <textarea
                  ref={textRef}
                  readOnly
                  value={message}
                  rows={2}
                  onClick={function (e) { e.target.select(); }}
                  className="flex-1 text-xs px-2.5 py-2 rounded-md resize-none"
                  style={{ background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--ink)" }}
                />
                <SecondaryButton onClick={copyMessage}>{copied ? "Copied!" : "Copy"}</SecondaryButton>
              </div>
              {copyFailed && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>Could not copy automatically — the message above is now selected, copy it with your device's copy shortcut.</p>}
            </div>
          )}
          {!hasAny && (
            <p className="text-sm" style={{ color: "var(--danger)" }}>No contact method is set up yet — add one from the owner dashboard.</p>
          )}
        </div>

        <button onClick={props.onClose} className="text-sm mt-5 cursor-pointer border-0 bg-transparent" style={{ color: "var(--ink-dim)" }}>Cancel</button>
      </div>
    </div>
  );
}
