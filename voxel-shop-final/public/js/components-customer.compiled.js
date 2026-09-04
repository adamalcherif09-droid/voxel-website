function Header(props) {
  var content = props.content;
  var cartCount = props.cartCount || 0;
  return /*#__PURE__*/React.createElement("header", {
    style: {
      background: "var(--canvas)",
      borderBottom: "1px solid var(--line)"
    },
    className: "sticky top-0 z-30"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-6xl mx-auto flex items-center justify-between px-5 sm:px-8 py-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: props.goHome,
    className: "voxel-brand flex items-center gap-2 bg-transparent border-0 cursor-pointer",
    "aria-label": content.businessName + " home"
  }, content.logoImage ? /*#__PURE__*/React.createElement("img", {
    src: content.logoImage,
    alt: content.businessName,
    style: {
      height: 60,
      width: "auto"
    }
  }) : /*#__PURE__*/React.createElement(BrandMark, null), /*#__PURE__*/React.createElement("span", {
    className: "font-display text-xl tracking-tight",
    style: {
      color: "var(--ink)",
      marginLeft: "-2px"
    }
  }, content.businessName)), /*#__PURE__*/React.createElement("nav", {
    className: "flex items-center gap-3 sm:gap-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: props.onCartOpen,
    "aria-label": "Open cart" + (cartCount ? " (" + cartCount + " item" + (cartCount === 1 ? "" : "s") + ")" : ""),
    className: "glass-accent flex items-center justify-center px-3 py-2 rounded-md border-0 cursor-pointer relative",
    style: {
      color: "var(--teal)"
    }
  }, /*#__PURE__*/React.createElement(ShoppingBag, {
    size: 18
  }), cartCount > 0 && /*#__PURE__*/React.createElement("span", {
    key: cartCount,
    className: "voxel-badge-bump font-mono-ac",
    style: {
      position: "absolute",
      top: -6,
      right: -6,
      minWidth: 20,
      height: 20,
      padding: "0 5px",
      borderRadius: 10,
      background: "var(--brass)",
      color: "#161618",
      fontSize: 11,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: 1
    }
  }, cartCount > 999 ? "999+" : cartCount)), /*#__PURE__*/React.createElement("button", {
    onClick: props.goCustom,
    className: "glass-accent tint-brass voxel-magnetic flex items-center gap-1.5 px-3.5 py-2 rounded-md border-0 cursor-pointer text-sm font-medium",
    style: {
      color: "#161618"
    }
  }, /*#__PURE__*/React.createElement(UploadCloud, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, "Custom print")))));
}
function Footer(props) {
  var content = props.content;
  var sec = props.security || DEFAULT_SECURITY;
  var clickState = React.useRef({
    count: 0,
    last: 0
  });
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
  var whatsappDisplayNumber = content.whatsappNumber || content.contactPhone;
  var whatsappFooterUrl = buildWhatsAppUrl(content.whatsappNumber || content.contactPhone, "Hi! I have a question.");
  var instagramUrl = buildInstagramDmUrl(content.instagramHandle);
  var tiktokUrl = buildTiktokUrl(content.tiktokHandle);
  var facebookUrl = buildFacebookUrl(content.facebookHandle);
  var hasAnything = content.contactEmail || whatsappDisplayNumber || instagramUrl || tiktokUrl || facebookUrl;
  return /*#__PURE__*/React.createElement("footer", {
    className: "mt-20 liquid-glass"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-6xl mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm",
    style: {
      color: "var(--ink-dim)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: handleSecretClick,
    className: "voxel-footer-tag",
    style: {
      cursor: "default",
      userSelect: "none"
    }
  }, content.businessName, " — ", content.footerTagline), hasAnything && /*#__PURE__*/React.createElement("div", {
    className: "footer-contacts flex flex-wrap items-center gap-x-4 gap-y-1 font-mono-ac text-xs"
  }, content.contactEmail && (mailtoUrl ? /*#__PURE__*/React.createElement("a", {
    href: mailtoUrl,
    style: {
      color: "inherit",
      textDecoration: "none"
    }
  }, content.contactEmail) : content.contactEmail), whatsappDisplayNumber && (whatsappFooterUrl ? /*#__PURE__*/React.createElement("a", {
    href: whatsappFooterUrl,
    target: "_blank",
    rel: "noopener noreferrer",
    style: {
      color: "inherit",
      textDecoration: "none"
    }
  }, whatsappDisplayNumber) : whatsappDisplayNumber), instagramUrl && /*#__PURE__*/React.createElement("a", {
    href: instagramUrl,
    target: "_blank",
    rel: "noopener noreferrer",
    style: {
      color: "inherit",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Instagram, {
    size: 14
  }), "Instagram"), tiktokUrl && /*#__PURE__*/React.createElement("a", {
    href: tiktokUrl,
    target: "_blank",
    rel: "noopener noreferrer",
    style: {
      color: "inherit",
      textDecoration: "none"
    }
  }, "TikTok"), facebookUrl && /*#__PURE__*/React.createElement("a", {
    href: facebookUrl,
    target: "_blank",
    rel: "noopener noreferrer",
    style: {
      color: "inherit",
      textDecoration: "none"
    }
  }, "Facebook"))));
}

// Share a design: on phones uses the native share sheet (WhatsApp,
// Instagram, Bluetooth...), on desktop copies the direct link to the
// model's own page (/?model=<id>), which any visitor opening later
// sees as an auto-opened detail popup. Handles clipboard fallbacks
// for browsers that block either path.
function ShareButton(props) {
  var model = props.model;
  var _copied = React.useState(false);
  var copied = _copied[0];
  var setCopied = _copied[1];
  var timerRef = React.useRef(null);
  React.useEffect(function () {
    return function () {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
  function flash() {
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(function () {
      setCopied(false);
    }, 2000);
  }
  function fallbackCopy() {
    var ok = false;
    try {
      var ta = document.createElement("textarea");
      ta.value = modelUrl;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand("copy");
      document.body.removeChild(ta);
    } catch (e) {
      ok = false;
    }
    if (ok) flash();else window.prompt("Copy this link:", modelUrl);
  }
  function share() {
    if (!model || !model.id) return;
    if (navigator.share) {
      navigator.share({
        title: model.name || "Voxel design",
        text: "Check out \"" + (model.name || "this design") + "\"",
        url: modelUrl
      }).catch(function () {/* visitor closed the share sheet — nothing to do */});
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(modelUrl).then(flash, fallbackCopy);
    } else {
      fallbackCopy();
    }
  }
  var modelUrl = window.location.origin + "/?model=" + encodeURIComponent(model ? model.id : "");
  if (props.compact) {
    return /*#__PURE__*/React.createElement("button", {
      onClick: function (e) {
        e.stopPropagation();
        share();
      },
      "aria-label": copied ? "Link copied" : "Share this design",
      title: copied ? "Link copied!" : "Share",
      className: "liquid-glass cursor-pointer border-0 rounded-md flex items-center justify-center flex-shrink-0",
      style: {
        width: 34,
        height: 34,
        color: "var(--brass-text)"
      }
    }, copied ? /*#__PURE__*/React.createElement(LinkIcon, {
      size: 14
    }) : /*#__PURE__*/React.createElement(ShareIcon, {
      size: 14
    }));
  }
  return /*#__PURE__*/React.createElement(SecondaryButton, {
    className: "w-full",
    icon: copied ? LinkIcon : ShareIcon,
    onClick: share
  }, copied ? "Link copied!" : "Share this design");
}
function ModelCard(props) {
  var model = props.model;
  var content = props.content;
  var isNew = content.showNewBadge !== false && isNewModel(model, content.newBadgeDays);
  return /*#__PURE__*/React.createElement("div", {
    onClick: props.onView,
    className: "voxel-card rounded-lg overflow-hidden flex flex-col cursor-pointer",
    style: {
      background: "var(--panel)",
      border: props.highlight ? "1px solid var(--brass)" : "1px solid var(--line)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center",
    style: {
      background: "var(--panel-2)",
      minHeight: model.image ? undefined : 140,
      position: "relative"
    }
  }, model.image ? /*#__PURE__*/React.createElement("img", {
    src: model.image,
    alt: model.name,
    loading: "lazy",
    decoding: "async",
    onLoad: function (e) {
      rememberImageRatio(model.id, e.currentTarget);
    },
    style: {
      width: "100%",
      height: "auto",
      display: "block"
    }
  }) : /*#__PURE__*/React.createElement(ImageIcon, {
    size: 26,
    style: {
      color: "var(--ink-dim)"
    }
  }), isNew && /*#__PURE__*/React.createElement("span", {
    className: "voxel-new-badge voxel-new-badge--absolute font-mono-ac"
  }, "New"), /*#__PURE__*/React.createElement("button", {
    onClick: function (e) {
      e.stopPropagation();
      props.onAddToCart();
    },
    "aria-label": "Add " + model.name + " to cart",
    title: "Add to cart",
    className: "cursor-pointer border-0",
    style: {
      position: "absolute",
      top: 10,
      right: 10,
      width: 34,
      height: 34,
      borderRadius: 17,
      background: "rgba(22,22,24,0.65)",
      color: "#f2ece5",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backdropFilter: "blur(2px)"
    }
  }, /*#__PURE__*/React.createElement(ShoppingBag, {
    size: 17
  }))), /*#__PURE__*/React.createElement("div", {
    className: "p-3 sm:p-4 flex flex-col flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-display text-sm sm:text-base",
    style: {
      color: "var(--ink)"
    }
  }, model.name), model.featured && /*#__PURE__*/React.createElement(Star, {
    size: 14,
    fill: "var(--brass-text)",
    style: {
      color: "var(--brass-text)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mt-3 gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-mono-ac text-xs sm:text-sm",
    style: {
      color: "var(--ink)"
    }
  }, model.price ? formatPriceDisplay(model.price, content) : "Ask for price"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(ShareButton, {
    model: model,
    compact: true
  }), /*#__PURE__*/React.createElement("button", {
    onClick: function (e) {
      e.stopPropagation();
      props.onOrder();
    },
    className: "liquid-glass tint-teal text-xs sm:text-sm font-medium px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-md cursor-pointer border-0",
    style: {
      color: "var(--canvas)"
    }
  }, "Order now")))));
}
function RecentPrintsWall(props) {
  var content = props.content;
  var prints = props.prints;
  // The track animates translateX(0 -> -50%) over two identical halves,
  // so the loop only looks seamless when one half is at least as wide
  // as the screen — short lists get repeated until they fill it. The
  // 30-item ceiling bounds that duplication only; every uploaded photo
  // always plays at least once per cycle.
  var repeats = Math.max(1, Math.ceil(10 / Math.max(1, prints.length)));
  while (repeats > 1 && prints.length * repeats > 30) repeats--;
  var half = [];
  for (var r = 0; r < repeats; r++) {
    for (var i = 0; i < prints.length; i++) half.push(prints[i]);
  }
  // Seconds-per-photo keeps the perceived speed constant no matter how
  // many photos are on the wall (owner-adjustable from the dashboard).
  var paceSeconds = Math.min(15, Math.max(1, Number(content.recentPrintsSpeed) || 2.6));
  var duration = Math.round(half.length * paceSeconds);
  var track = half.concat(half);
  return /*#__PURE__*/React.createElement("section", {
    className: "pb-14"
  }, /*#__PURE__*/React.createElement(Eyebrow, null, content.recentPrintsEyebrow), /*#__PURE__*/React.createElement("div", {
    className: "voxel-marquee"
  }, /*#__PURE__*/React.createElement("div", {
    className: "voxel-marquee-track",
    style: {
      animationDuration: duration + "s"
    }
  }, track.map(function (p, i) {
    return /*#__PURE__*/React.createElement("figure", {
      key: p.id + "-" + i,
      className: "voxel-marquee-item"
    }, /*#__PURE__*/React.createElement("img", {
      src: p.image,
      alt: p.caption || "Recent print",
      loading: "lazy",
      decoding: "async"
    }), p.caption ? /*#__PURE__*/React.createElement("figcaption", null, p.caption) : null);
  }))));
}
function HowItWorksStrip(props) {
  var content = props.content;
  // Deliberately one slim, non-interactive bar — three big tiles read
  // as clickable category cards, which they aren't. Step descriptions
  // ride along as native hover tooltips instead of taking up space.
  return /*#__PURE__*/React.createElement("section", {
    className: "pb-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "voxel-how-strip"
  }, /*#__PURE__*/React.createElement("span", {
    className: "voxel-how-label font-mono-ac"
  }, content.howItWorksEyebrow), /*#__PURE__*/React.createElement("span", {
    className: "voxel-how-steps"
  }, [1, 2, 3].map(function (n, i) {
    return /*#__PURE__*/React.createElement("span", {
      key: n,
      className: "voxel-how-entry"
    }, i > 0 && /*#__PURE__*/React.createElement("span", {
      className: "voxel-how-arrow",
      "aria-hidden": "true"
    }, "→"), /*#__PURE__*/React.createElement("span", {
      className: "voxel-how-step",
      title: content["howItWorksStep" + n + "Body"] || undefined
    }, /*#__PURE__*/React.createElement("span", {
      className: "voxel-how-num font-mono-ac"
    }, n), /*#__PURE__*/React.createElement("span", {
      className: "voxel-how-title"
    }, content["howItWorksStep" + n + "Title"])));
  }))));
}
function HomeView(props) {
  var content = props.content;
  var categories = props.categories;
  var models = props.models;
  var featured = models.filter(function (m) {
    return m.featured;
  });
  var recentPrints = content.recentPrints || [];
  var featuredMasonryRef = React.useRef(null);
  return /*#__PURE__*/React.createElement("div", {
    className: "max-w-6xl mx-auto px-5 sm:px-8"
  }, /*#__PURE__*/React.createElement("section", {
    className: "pt-14 sm:pt-20 pb-10 voxel-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "voxel-hero-fx",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement(Eyebrow, null, content.businessName, " — ", content.heroEyebrow), /*#__PURE__*/React.createElement("h1", {
    className: "voxel-reveal font-display font-medium leading-tight",
    style: {
      color: "var(--ink)",
      fontSize: "clamp(2.2rem, 5vw, 3.4rem)"
    }
  }, content.heroHeadlineLine1, /*#__PURE__*/React.createElement("br", null), content.heroHeadlineLine2), /*#__PURE__*/React.createElement("p", {
    className: "voxel-fade mt-5 max-w-lg text-base sm:text-lg",
    style: {
      color: "var(--ink-dim)"
    }
  }, content.heroSubtext)), content.showHowItWorks !== false && /*#__PURE__*/React.createElement(HowItWorksStrip, {
    content: content
  }), featured.length > 0 && /*#__PURE__*/React.createElement("section", {
    className: "pb-14"
  }, /*#__PURE__*/React.createElement(Eyebrow, null, content.featuredEyebrow), /*#__PURE__*/React.createElement("div", {
    className: "voxel-masonry",
    ref: featuredMasonryRef
  }, featured.map(function (m) {
    return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      className: "voxel-masonry-item"
    }, /*#__PURE__*/React.createElement(ModelCard, {
      model: m,
      content: content,
      onOrder: function () {
        props.onOrderModel(m);
      },
      onView: function () {
        props.onViewModel(m);
      },
      onAddToCart: function () {
        props.onAddToCart(m);
      },
      highlight: true
    }));
  }))), /*#__PURE__*/React.createElement("section", {
    className: "pb-14"
  }, /*#__PURE__*/React.createElement(Eyebrow, null, content.categoriesEyebrow), /*#__PURE__*/React.createElement("div", {
    className: "cat-shelf liquid-glass grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      props.goCategory(ALL_DESIGNS_CATEGORY);
    },
    className: "glass-accent tint-brass cat-tile-accent col-span-2 text-left p-5 cursor-pointer border-0"
  }, /*#__PURE__*/React.createElement(Layers, {
    size: 20,
    style: {
      color: "var(--brass-text)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "font-display text-lg mt-3",
    style: {
      color: "var(--ink)"
    }
  }, "All Designs"), /*#__PURE__*/React.createElement("div", {
    className: "text-xs mt-1 font-mono-ac",
    "data-countup": true,
    style: {
      color: "var(--ink-dim)"
    }
  }, models.length > 0 ? models.length + " " + (models.length === 1 ? "design" : "designs") : "Coming soon")), categories.map(function (c) {
    var count = models.filter(function (m) {
      return m.categoryId === c.id;
    }).length;
    return /*#__PURE__*/React.createElement("button", {
      key: c.id,
      onClick: function () {
        props.goCategory(c);
      },
      className: "glass-accent cat-tile-accent text-left p-5 cursor-pointer border-0"
    }, /*#__PURE__*/React.createElement(Layers, {
      size: 18,
      style: {
        color: "var(--brass-text)"
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "font-display text-base mt-3",
      style: {
        color: "var(--ink)"
      }
    }, c.name), /*#__PURE__*/React.createElement("div", {
      className: "text-xs mt-1 font-mono-ac",
      style: {
        color: "var(--ink-dim)"
      }
    }, count > 0 ? count + " " + (count === 1 ? "design" : "designs") : "Coming soon"));
  }))), content.showRecentPrints !== false && recentPrints.length > 0 && /*#__PURE__*/React.createElement(RecentPrintsWall, {
    content: content,
    prints: recentPrints
  }), /*#__PURE__*/React.createElement("section", {
    className: "pb-16"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 p-6 sm:p-8 rounded-lg",
    style: {
      border: "1px dashed var(--brass)",
      background: "var(--cta-soft)"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "font-display text-lg",
    style: {
      color: "var(--ink)"
    }
  }, content.customCtaHeading), /*#__PURE__*/React.createElement("p", {
    className: "text-sm mt-1 max-w-md",
    style: {
      color: "var(--ink-dim)"
    }
  }, content.customCtaBody)), /*#__PURE__*/React.createElement(PrimaryButton, {
    onClick: props.goCustom,
    icon: UploadCloud
  }, content.customCtaButton))));
}
function CategoryView(props) {
  var content = props.content;
  var category = props.category;
  var models = props.models;
  var _query = React.useState("");
  var query = _query[0];
  var setQuery = _query[1];
  React.useEffect(function () {
    setQuery("");
  }, [category.id]);
  var q = query.trim().toLowerCase();
  var items = category.id === ALL_DESIGNS_CATEGORY_ID ? models : models.filter(function (m) {
    return m.categoryId === category.id;
  });
  var visibleItems = q ? items.filter(function (m) {
    return (m.name || "").toLowerCase().indexOf(q) !== -1 || (m.description || "").toLowerCase().indexOf(q) !== -1;
  }) : items;
  var masonryRef = React.useRef(null);
  return /*#__PURE__*/React.createElement("div", {
    className: "max-w-6xl mx-auto px-5 sm:px-8 py-10"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: props.goBack,
    className: "voxel-on-film flex items-center gap-1.5 text-sm mb-6 bg-transparent border-0 cursor-pointer",
    style: {
      color: "var(--ink-dim)"
    }
  }, /*#__PURE__*/React.createElement(ChevronLeft, {
    size: 16
  }), " Back"), /*#__PURE__*/React.createElement(Eyebrow, null, "Category"), /*#__PURE__*/React.createElement("h2", {
    className: "voxel-on-film font-display text-2xl sm:text-3xl mb-4",
    style: {
      color: "var(--ink)"
    }
  }, category.name), items.length >= 4 && /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("input", {
    value: query,
    onChange: function (e) {
      setQuery(e.target.value);
    },
    placeholder: "Search " + category.name + "…",
    className: "w-full px-3.5 py-2.5 rounded-md text-sm",
    style: {
      background: "var(--panel)",
      border: "1px solid var(--line)",
      color: "var(--ink)"
    }
  }), q && /*#__PURE__*/React.createElement("div", {
    className: "text-xs mt-2 font-mono-ac",
    style: {
      color: "var(--ink-dim)"
    }
  }, visibleItems.length + " " + (visibleItems.length === 1 ? "match" : "matches"))), items.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: Package,
    title: content.emptyCategoryTitle,
    body: content.emptyCategoryBody
  }) : visibleItems.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: Package,
    title: "No designs match your search",
    body: "Nothing here matches \"" + query.trim() + "\" — try a shorter word."
  }) : /*#__PURE__*/React.createElement("div", {
    className: "voxel-masonry",
    ref: masonryRef
  }, visibleItems.map(function (m) {
    return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      className: "voxel-masonry-item"
    }, /*#__PURE__*/React.createElement(ModelCard, {
      model: m,
      content: content,
      onOrder: function () {
        props.onOrderModel(m);
      },
      onView: function () {
        props.onViewModel(m);
      },
      onAddToCart: function () {
        props.onAddToCart(m);
      }
    }));
  })));
}
function CustomOrderView(props) {
  var content = props.content;
  var _file = React.useState(null);
  var file = _file[0];
  var setFile = _file[1];
  var _fileError = React.useState("");
  var fileError = _fileError[0];
  var setFileError = _fileError[1];
  var _notes = React.useState("");
  var notes = _notes[0];
  var setNotes = _notes[1];
  var _error = React.useState("");
  var error = _error[0];
  var setError = _error[1];
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
    setFile({
      name: f.name,
      size: f.size
    });
  }
  function handleSubmit() {
    if (!file) {
      setError("Attach your file first.");
      return;
    }
    setError("");
    props.onOrderNow({
      fileName: file.name,
      note: notes.trim()
    });
  }
  var hasContact = content.contactPhone || content.contactEmail || content.whatsappNumber;
  return /*#__PURE__*/React.createElement("div", {
    className: "max-w-2xl mx-auto px-5 sm:px-8 py-10"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: props.goBack,
    className: "voxel-on-film flex items-center gap-1.5 text-sm mb-6 bg-transparent border-0 cursor-pointer",
    style: {
      color: "var(--ink-dim)"
    }
  }, /*#__PURE__*/React.createElement(ChevronLeft, {
    size: 16
  }), " Back"), /*#__PURE__*/React.createElement(Eyebrow, null, "Custom order"), /*#__PURE__*/React.createElement("h2", {
    className: "voxel-on-film font-display text-2xl",
    style: {
      color: "var(--ink)"
    }
  }, content.customPageHeading), /*#__PURE__*/React.createElement("p", {
    className: "text-sm mt-2 max-w-md",
    style: {
      color: "var(--ink-dim)"
    }
  }, content.customPageSubtext), hasContact && /*#__PURE__*/React.createElement("p", {
    className: "text-xs mt-2 font-mono-ac",
    style: {
      color: "var(--ink-dim)"
    }
  }, "Or reach us directly — ", content.contactEmail && (buildMailtoUrl(content.contactEmail) ? /*#__PURE__*/React.createElement("a", {
    href: buildMailtoUrl(content.contactEmail),
    style: {
      color: "inherit"
    }
  }, content.contactEmail) : content.contactEmail), content.contactEmail && (content.whatsappNumber || content.contactPhone) ? " · " : "", (content.whatsappNumber || content.contactPhone) && (buildWhatsAppUrl(content.whatsappNumber || content.contactPhone, "Hi! I have a question.") ? /*#__PURE__*/React.createElement("a", {
    href: buildWhatsAppUrl(content.whatsappNumber || content.contactPhone, "Hi! I have a question."),
    target: "_blank",
    rel: "noopener noreferrer",
    style: {
      color: "inherit"
    }
  }, content.whatsappNumber || content.contactPhone) : content.whatsappNumber || content.contactPhone)), /*#__PURE__*/React.createElement("div", {
    className: "mt-8 flex flex-col gap-6"
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex flex-col gap-1.5 text-sm",
    style: {
      color: "var(--ink)"
    }
  }, "Your file", /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 p-4 rounded-md",
    style: {
      border: "1px dashed var(--line)"
    }
  }, /*#__PURE__*/React.createElement(UploadCloud, {
    size: 18,
    style: {
      color: "var(--ink-dim)"
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".stl,.3mf,.step,.stp,.obj",
    onChange: handleFile,
    className: "text-sm",
    style: {
      color: "var(--ink-dim)"
    }
  })), file && /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-mono-ac",
    style: {
      color: "var(--ink-dim)"
    }
  }, file.name, " — ", (file.size / 1024 / 1024).toFixed(2), " MB"), fileError && /*#__PURE__*/React.createElement("span", {
    className: "text-xs",
    style: {
      color: "var(--danger)"
    }
  }, fileError)), /*#__PURE__*/React.createElement("label", {
    className: "flex flex-col gap-1.5 text-sm",
    style: {
      color: "var(--ink)"
    }
  }, "Anything we should know? (optional)", /*#__PURE__*/React.createElement("textarea", {
    value: notes,
    onChange: function (e) {
      setNotes(e.target.value);
    },
    rows: 3,
    placeholder: "Color, material, size, quantity — whatever matters to you.",
    className: "px-3.5 py-2.5 rounded-md text-sm resize-none",
    style: {
      background: "var(--panel)",
      border: "1px solid var(--line)",
      color: "var(--ink)"
    }
  })), error && /*#__PURE__*/React.createElement("div", {
    className: "text-sm",
    style: {
      color: "var(--danger)"
    }
  }, error), /*#__PURE__*/React.createElement(PrimaryButton, {
    onClick: handleSubmit
  }, "Order now"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs",
    style: {
      color: "var(--ink-dim)"
    }
  }, "You will pick WhatsApp or Instagram next, and can attach the file once the chat opens.")));
}
function ModelDetailPopup(props) {
  var model = props.model;
  var content = props.content;
  return /*#__PURE__*/React.createElement("div", {
    onClick: props.onClose,
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(22,22,24,0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 60,
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: function (e) {
      e.stopPropagation();
    },
    style: {
      background: "var(--panel)",
      borderRadius: 16,
      maxWidth: 420,
      width: "100%",
      border: "1px solid var(--line)",
      overflow: "hidden",
      maxHeight: "90vh",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      background: "var(--panel-2)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center",
    style: {
      aspectRatio: "1 / 1"
    }
  }, model.image ? /*#__PURE__*/React.createElement("img", {
    src: model.image,
    alt: model.name,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : /*#__PURE__*/React.createElement(ImageIcon, {
    size: 40,
    style: {
      color: "var(--ink-dim)"
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: props.onClose,
    className: "liquid-glass liquid-glass--round cursor-pointer border-0",
    "aria-label": "Close",
    style: {
      position: "absolute",
      top: 12,
      right: 12,
      width: 32,
      height: 32,
      background: "rgba(22,22,24,0.35)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "p-5 flex flex-col gap-3",
    style: {
      overflowY: "auto"
    }
  }, content.showNewBadge !== false && isNewModel(model, content.newBadgeDays) && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "voxel-new-badge font-mono-ac"
  }, "New")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-display text-lg",
    style: {
      color: "var(--ink)"
    }
  }, model.name), model.featured && /*#__PURE__*/React.createElement(Star, {
    size: 17,
    fill: "var(--brass-text)",
    style: {
      color: "var(--brass-text)"
    }
  })), model.description && /*#__PURE__*/React.createElement("p", {
    className: "text-sm",
    style: {
      color: "var(--ink-dim)"
    }
  }, model.description), /*#__PURE__*/React.createElement("div", {
    className: "font-mono-ac text-base",
    style: {
      color: "var(--ink)"
    }
  }, model.price ? formatPriceDisplay(model.price, content) : "Ask for price"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col sm:flex-row gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement(SecondaryButton, {
    className: "w-full",
    icon: ShoppingBag,
    onClick: props.onAddToCart
  }, "Add to cart")), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement(PrimaryButton, {
    className: "w-full",
    onClick: props.onOrder
  }, "Order now"))), /*#__PURE__*/React.createElement(ShareButton, {
    model: model
  }))));
}
function OrderContactPopup(props) {
  var content = props.content;
  var item = props.item;
  var _copied = React.useState(false);
  var copied = _copied[0];
  var setCopied = _copied[1];
  var _copyFailed = React.useState(false);
  var copyFailed = _copyFailed[0];
  var setCopyFailed = _copyFailed[1];
  var textRef = React.useRef(null);
  var isCustom = item.type === "custom";
  // WhatsApp and Instagram links can only pre-fill plain text — there is
  // no way to attach the actual photo through them. Instead, for a
  // catalog item, the message includes a link back to that exact model
  // on the site, so opening it shows the name, price, and photo.
  var modelLink = !isCustom && item.id ? window.location.origin + "/?model=" + encodeURIComponent(item.id) : "";
  var message = isCustom ? "Hi! I have a custom design I would like printed." + (item.fileName ? " File: " + item.fileName + "." : "") + (item.note ? " " + item.note : "") : "Hi! I would like to order: " + item.name + (modelLink ? " — " + modelLink : "");
  // Same fallback the footer uses: if no dedicated WhatsApp number is
  // set, the general contact phone number becomes the WhatsApp chat.
  var waUrl = buildWhatsAppUrl(content.whatsappNumber || content.contactPhone, message);
  var igUrl = buildInstagramDmUrl(content.instagramHandle);
  var hasAny = waUrl || igUrl;
  function handleWhatsAppClick() {
    props.onLogInquiry("whatsapp");
    props.onClose();
  }
  function handleInstagramClick() {
    props.onLogInquiry("instagram");
    // Match the WhatsApp flow: the choice was made, so close the popup.
    props.onClose();
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
      } catch (e2) {
        ok = false;
      }
      if (ok) {
        setCopied(true);
        setCopyFailed(false);
        setTimeout(function () {
          setCopied(false);
        }, 2000);
      } else {
        setCopyFailed(true);
        if (textRef.current) {
          textRef.current.focus();
          textRef.current.select();
        }
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(message).then(function () {
        setCopied(true);
        setCopyFailed(false);
        setTimeout(function () {
          setCopied(false);
        }, 2000);
      }, fallback);
    } else {
      fallback();
    }
  }
  return /*#__PURE__*/React.createElement("div", {
    onClick: props.onClose,
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(22,22,24,0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 60,
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: function (e) {
      e.stopPropagation();
    },
    style: {
      background: "var(--panel)",
      borderRadius: 16,
      padding: 28,
      maxWidth: 380,
      width: "100%",
      border: "1px solid var(--line)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-display text-lg",
    style: {
      color: "var(--ink)"
    }
  }, "How would you like to order?"), /*#__PURE__*/React.createElement("button", {
    onClick: props.onClose,
    className: "cursor-pointer border-0 bg-transparent",
    style: {
      color: "var(--ink-dim)"
    },
    "aria-label": "Close"
  }, /*#__PURE__*/React.createElement(X, {
    size: 18
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-sm mt-2",
    style: {
      color: "var(--ink-dim)"
    }
  }, isCustom ? "We will open a chat — attach your file once it opens." : "We will open a chat about \"" + item.name + "\"."), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-3 mt-5"
  }, waUrl && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("a", {
    href: waUrl,
    target: "_blank",
    rel: "noopener noreferrer",
    onClick: handleWhatsAppClick,
    className: "liquid-glass tint-brass inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md text-sm font-medium w-full",
    style: {
      color: "#161618",
      textDecoration: "none"
    }
  }, /*#__PURE__*/React.createElement(MessageCircle, {
    size: 16
  }), "Message on WhatsApp"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs mt-1.5",
    style: {
      color: "var(--ink-dim)"
    }
  }, "If nothing opens: ", /*#__PURE__*/React.createElement("a", {
    href: waUrl,
    target: "_blank",
    rel: "noopener noreferrer",
    style: {
      color: "var(--teal)"
    }
  }, "tap this link"), " instead.")), igUrl && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("a", {
    href: igUrl,
    target: "_blank",
    rel: "noopener noreferrer",
    onClick: handleInstagramClick,
    className: "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium w-full",
    style: {
      background: "transparent",
      color: "var(--ink)",
      border: "1px solid var(--line)",
      textDecoration: "none"
    }
  }, /*#__PURE__*/React.createElement(Instagram, {
    size: 16
  }), "Message on Instagram"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs mt-1.5",
    style: {
      color: "var(--ink-dim)"
    }
  }, "If nothing opens: ", /*#__PURE__*/React.createElement("a", {
    href: igUrl,
    target: "_blank",
    rel: "noopener noreferrer",
    style: {
      color: "var(--teal)"
    }
  }, "tap this link"), " instead."), /*#__PURE__*/React.createElement("p", {
    className: "text-xs mt-2",
    style: {
      color: "var(--ink-dim)"
    }
  }, "Instagram cannot pre-fill the message. Copy it below and paste it once the chat opens:"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-2"
  }, /*#__PURE__*/React.createElement("textarea", {
    ref: textRef,
    readOnly: true,
    value: message,
    rows: 2,
    onClick: function (e) {
      e.target.select();
    },
    className: "flex-1 text-xs px-2.5 py-2 rounded-md resize-none",
    style: {
      background: "var(--panel-2)",
      border: "1px solid var(--line)",
      color: "var(--ink)"
    }
  }), /*#__PURE__*/React.createElement(SecondaryButton, {
    onClick: copyMessage
  }, copied ? "Copied!" : "Copy")), copyFailed && /*#__PURE__*/React.createElement("p", {
    className: "text-xs mt-1",
    style: {
      color: "var(--danger)"
    }
  }, "Could not copy automatically — the message above is now selected, copy it with your device's copy shortcut.")), !hasAny && /*#__PURE__*/React.createElement("p", {
    className: "text-sm",
    style: {
      color: "var(--danger)"
    }
  }, "No contact method is set up yet — add one from the owner dashboard.")), /*#__PURE__*/React.createElement("button", {
    onClick: props.onClose,
    className: "text-sm mt-5 cursor-pointer border-0 bg-transparent",
    style: {
      color: "var(--ink-dim)"
    }
  }, "Cancel")));
}

// Editable quantity field: lets the customer type any amount directly
// instead of only nudging with +/-, and commits the clamped value on
// blur or Enter so an in-progress edit never snaps mid-keystroke.
function QtyInput(props) {
  var _draft = React.useState(String(props.value == null ? 1 : props.value));
  var draft = _draft[0];
  var setDraft = _draft[1];
  React.useEffect(function () {
    setDraft(String(props.value == null ? 1 : props.value));
  }, [props.value]);
  function commit() {
    var next = clampQty(draft);
    setDraft(String(next));
    props.onCommit(next);
  }
  return /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    max: MAX_CART_QTY,
    "aria-label": props.label,
    value: draft,
    onChange: function (e) {
      setDraft(e.target.value);
    },
    onBlur: commit,
    onKeyDown: function (e) {
      if (e.key === "Enter") e.currentTarget.blur();
    },
    className: "font-mono-ac",
    style: props.style
  });
}
function QuickAddPopup(props) {
  var model = props.model;
  var content = props.content;
  var priced = Number(model.price) > 0;
  var _qty = React.useState(1);
  var qty = _qty[0];
  var setQty = _qty[1];
  React.useEffect(function () {
    function onKey(e) {
      if (e.key === "Escape") props.onClose();
    }
    document.addEventListener("keydown", onKey);
    return function () {
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    onClick: props.onClose,
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(22,22,24,0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 60,
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: function (e) {
      e.stopPropagation();
    },
    className: "voxel-quick-pop",
    style: {
      background: "var(--panel)",
      borderRadius: 16,
      width: "100%",
      maxWidth: 360,
      border: "1px solid var(--line)",
      overflow: "hidden",
      boxShadow: "0 18px 50px rgba(22,22,24,0.25)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3 p-4",
    style: {
      background: "var(--panel-2)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 76,
      height: 76,
      borderRadius: 10,
      overflow: "hidden",
      flexShrink: 0,
      background: "var(--panel)"
    }
  }, model.image ? /*#__PURE__*/React.createElement("img", {
    src: model.image,
    alt: model.name,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : /*#__PURE__*/React.createElement(ImageIcon, {
    size: 24,
    style: {
      color: "var(--ink-dim)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col justify-center flex-1",
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-display text-base",
    style: {
      color: "var(--ink)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, model.name), /*#__PURE__*/React.createElement("div", {
    className: "font-mono-ac text-sm mt-1",
    style: {
      color: "var(--ink)"
    }
  }, priced ? formatPriceDisplay(model.price, content) : "Ask for price"))), /*#__PURE__*/React.createElement("div", {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm",
    style: {
      color: "var(--ink-dim)"
    }
  }, "Quantity"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center",
    style: {
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      setQty(Math.max(1, qty - 1));
    },
    "aria-label": "Decrease quantity",
    className: "cursor-pointer border-0",
    style: {
      width: 30,
      height: 30,
      borderRadius: 8,
      border: "1px solid var(--line)",
      background: "transparent",
      color: "var(--ink)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Minus, {
    size: 14
  })), /*#__PURE__*/React.createElement(QtyInput, {
    label: "Quantity",
    value: qty,
    onCommit: setQty,
    style: {
      width: 52,
      height: 30,
      borderRadius: 8,
      border: "1px solid var(--line)",
      background: "transparent",
      color: "var(--ink)",
      textAlign: "center",
      fontSize: 14,
      padding: 0
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      setQty(Math.min(MAX_CART_QTY, qty + 1));
    },
    "aria-label": "Increase quantity",
    className: "cursor-pointer border-0",
    style: {
      width: 30,
      height: 30,
      borderRadius: 8,
      border: "1px solid var(--line)",
      background: "transparent",
      color: "var(--ink)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 14
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mt-4 text-sm",
    style: {
      color: "var(--ink)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--ink-dim)"
    }
  }, "Total"), /*#__PURE__*/React.createElement("span", {
    className: "font-mono-ac"
  }, priced ? content.currencySymbol + (Number(model.price) * qty).toFixed(2) : "Ask for price")), /*#__PURE__*/React.createElement("div", {
    className: "mt-4"
  }, /*#__PURE__*/React.createElement(PrimaryButton, {
    className: "w-full",
    onClick: function () {
      props.onAdd(model, qty);
    }
  }, "Add to cart")), /*#__PURE__*/React.createElement("button", {
    onClick: props.onClose,
    className: "w-full text-sm mt-3 cursor-pointer border-0 bg-transparent",
    style: {
      color: "var(--ink-dim)"
    }
  }, "Cancel"))));
}
function CartDrawer(props) {
  var items = props.items;
  var content = props.content;
  var totalUsd = cartSubtotalUsd(items);
  var pricedItems = items.filter(function (it) {
    return Number(it.price) > 0;
  });
  var pendingItems = items.length - pricedItems.length;
  React.useEffect(function () {
    if (!props.open) return;
    function onKey(e) {
      if (e.key === "Escape") props.onClose();
    }
    document.addEventListener("keydown", onKey);
    // Lock the page behind the drawer (marketplace behavior) and restore
    // it when the drawer closes.
    var prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return function () {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [props.open]);
  if (!props.open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 70
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: props.onClose,
    style: {
      position: "absolute",
      inset: 0,
      background: "rgba(22,22,24,0.55)"
    },
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("aside", {
    className: "voxel-cart-drawer",
    "aria-label": "Shopping cart",
    style: {
      position: "absolute",
      top: 0,
      right: 0,
      height: "100%",
      width: "100%",
      maxWidth: 420,
      background: "var(--panel)",
      boxShadow: "-18px 0 50px rgba(22,22,24,0.25)",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-5 py-4",
    style: {
      borderBottom: "1px solid var(--line)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-display text-lg",
    style: {
      color: "var(--ink)"
    }
  }, "Your cart ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono-ac text-sm",
    style: {
      color: "var(--ink-dim)"
    }
  }, "(", cartItemCount(items), " ", cartItemCount(items) === 1 ? "item" : "items", ")")), /*#__PURE__*/React.createElement("button", {
    onClick: props.onClose,
    className: "cursor-pointer border-0 bg-transparent",
    style: {
      color: "var(--ink-dim)"
    },
    "aria-label": "Close cart"
  }, /*#__PURE__*/React.createElement(X, {
    size: 18
  }))), items.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center justify-center text-center px-6 flex-1"
  }, /*#__PURE__*/React.createElement(ShoppingBag, {
    size: 30,
    style: {
      color: "var(--ink-dim)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "font-display text-lg mt-4",
    style: {
      color: "var(--ink)"
    }
  }, "Your cart is empty"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm mt-1 max-w-xs",
    style: {
      color: "var(--ink-dim)"
    }
  }, "Add a few designs and come back here to order them all at once."), /*#__PURE__*/React.createElement("div", {
    className: "mt-5"
  }, /*#__PURE__*/React.createElement(SecondaryButton, {
    onClick: props.onClose
  }, "Browse designs"))) : /*#__PURE__*/React.createElement("div", {
    className: "flex-1 px-5",
    style: {
      minHeight: 0,
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement("ul", {
    className: "flex flex-col gap-4 py-4"
  }, items.map(function (it) {
    return /*#__PURE__*/React.createElement("li", {
      key: it.modelId,
      className: "flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 56,
        height: 56,
        borderRadius: 8,
        overflow: "hidden",
        flexShrink: 0,
        background: "var(--panel-2)"
      }
    }, it.image ? /*#__PURE__*/React.createElement("img", {
      src: it.image,
      alt: it.name,
      style: {
        width: "100%",
        height: "100%",
        objectFit: "cover"
      }
    }) : /*#__PURE__*/React.createElement(ImageIcon, {
      size: 18,
      style: {
        color: "var(--ink-dim)"
      }
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex-1",
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-sm",
      style: {
        color: "var(--ink)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }
    }, it.name), /*#__PURE__*/React.createElement("div", {
      className: "font-mono-ac text-xs",
      style: {
        color: "var(--ink-dim)",
        marginTop: 2
      }
    }, Number(it.price) > 0 ? content.currencySymbol + Number(it.price).toFixed(2) + " each" : "Price to confirm"), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mt-1.5"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: function () {
        props.onChangeQty(it.modelId, -1);
      },
      "aria-label": "Decrease quantity of " + it.name,
      className: "cursor-pointer border-0",
      style: {
        width: 24,
        height: 24,
        borderRadius: 6,
        border: "1px solid var(--line)",
        background: "transparent",
        color: "var(--ink)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(Minus, {
      size: 12
    })), /*#__PURE__*/React.createElement(QtyInput, {
      label: "Quantity of " + it.name,
      value: it.qty,
      onCommit: function (next) {
        props.onChangeQtyTo(it.modelId, next);
      },
      style: {
        width: 44,
        height: 24,
        borderRadius: 6,
        border: "1px solid var(--line)",
        background: "transparent",
        color: "var(--ink)",
        textAlign: "center",
        fontSize: 12,
        padding: 0,
        minWidth: 20
      }
    }), /*#__PURE__*/React.createElement("button", {
      onClick: function () {
        props.onChangeQty(it.modelId, 1);
      },
      "aria-label": "Increase quantity of " + it.name,
      className: "cursor-pointer border-0",
      style: {
        width: 24,
        height: 24,
        borderRadius: 6,
        border: "1px solid var(--line)",
        background: "transparent",
        color: "var(--ink)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(Plus, {
      size: 12
    })))), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col",
      style: {
        alignItems: "flex-end",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: function () {
        props.onRemove(it.modelId);
      },
      "aria-label": "Remove " + it.name + " from cart",
      className: "cursor-pointer border-0 bg-transparent",
      style: {
        color: "var(--danger)"
      }
    }, /*#__PURE__*/React.createElement(Trash2, {
      size: 14
    })), /*#__PURE__*/React.createElement("span", {
      className: "font-mono-ac text-xs",
      style: {
        color: "var(--ink)"
      }
    }, Number(it.price) > 0 ? content.currencySymbol + ((Number(it.price) || 0) * it.qty).toFixed(2) : "Ask for price")));
  }))), items.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 flex flex-col gap-3",
    style: {
      borderTop: "1px solid var(--line)",
      background: "var(--panel)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm",
    style: {
      color: "var(--ink-dim)"
    }
  }, "Subtotal"), /*#__PURE__*/React.createElement("span", {
    className: "font-mono-ac text-base",
    style: {
      color: "var(--ink)"
    }
  }, pricedItems.length > 0 ? formatPriceDisplay(totalUsd, content) : "Ask for price")), pendingItems > 0 && pricedItems.length > 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-xs",
    style: {
      color: "var(--ink-dim)"
    }
  }, "+ price to be confirmed for ", pendingItems, " item", pendingItems > 1 ? "s" : ""), /*#__PURE__*/React.createElement("p", {
    className: "text-xs",
    style: {
      color: "var(--ink-dim)"
    }
  }, "Shipping is confirmed when you message — you only pay after agreeing on the details, no upfront payment."), props.checkoutUrl ? /*#__PURE__*/React.createElement("a", {
    href: props.checkoutUrl,
    target: "_blank",
    rel: "noopener noreferrer",
    onClick: props.onCheckout,
    className: "liquid-glass liquid-glass--tint-brass voxel-magnetic w-full flex items-center justify-center gap-2 cursor-pointer",
    style: {
      padding: "12px 18px",
      borderRadius: 12,
      color: "var(--ink)",
      textDecoration: "none"
    }
  }, /*#__PURE__*/React.createElement(MessageCircle, {
    size: 18
  }), /*#__PURE__*/React.createElement("span", null, "Checkout on WhatsApp")) : /*#__PURE__*/React.createElement("span", {
    className: "w-full flex items-center justify-center gap-2",
    style: {
      padding: "12px 18px",
      borderRadius: 12,
      border: "1px solid var(--line)",
      color: "var(--ink-dim)",
      background: "var(--panel)"
    }
  }, /*#__PURE__*/React.createElement(MessageCircle, {
    size: 18
  }), /*#__PURE__*/React.createElement("span", null, "Checkout unavailable")), /*#__PURE__*/React.createElement("button", {
    onClick: props.onClose,
    className: "text-sm cursor-pointer border-0 bg-transparent",
    style: {
      color: "var(--ink-dim)"
    }
  }, "Continue shopping"))));
}
function RestoreCartPopup(props) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: props.onDiscard,
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(22,22,24,0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 70,
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: function (e) {
      e.stopPropagation();
    },
    style: {
      background: "var(--panel)",
      borderRadius: 16,
      padding: 28,
      maxWidth: 400,
      width: "100%",
      border: "1px solid var(--line)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 10,
      background: "var(--panel-2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(ShoppingBag, {
    size: 20,
    style: {
      color: "var(--brass-text)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "font-display text-lg",
    style: {
      color: "var(--ink)"
    }
  }, "Your cart is waiting")), /*#__PURE__*/React.createElement("button", {
    onClick: props.onDiscard,
    className: "cursor-pointer border-0 bg-transparent",
    style: {
      color: "var(--ink-dim)"
    },
    "aria-label": "Discard saved cart"
  }, /*#__PURE__*/React.createElement(X, {
    size: 18
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-sm mt-4 leading-relaxed",
    style: {
      color: "var(--ink-dim)"
    }
  }, "You had ", props.count === 1 ? "1 item" : props.count + " items", " saved in your cart. Did you want to keep it\xA0there?"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2.5 mt-6"
  }, /*#__PURE__*/React.createElement(PrimaryButton, {
    className: "w-full",
    onClick: props.onKeep
  }, "Yes, keep my cart"), /*#__PURE__*/React.createElement(SecondaryButton, {
    className: "w-full",
    onClick: props.onDiscard
  }, "No, start fresh"))));
}
function CartToast(props) {
  if (!props.visible) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "voxel-cart-toast",
    role: "status",
    style: {
      position: "fixed",
      left: "50%",
      bottom: 24,
      transform: "translateX(-50%)",
      zIndex: 80,
      background: "var(--panel)",
      border: "1px solid var(--line)",
      borderRadius: 12,
      boxShadow: "0 14px 40px rgba(22,22,24,0.3)",
      padding: "10px 14px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      maxWidth: "min(92vw, 460px)"
    }
  }, /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 17,
    style: {
      color: "var(--teal)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col",
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm",
    style: {
      color: "var(--ink)"
    }
  }, "Added to cart"), props.label && /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-mono-ac",
    style: {
      color: "var(--ink-dim)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      maxWidth: 200
    }
  }, props.label)), /*#__PURE__*/React.createElement("button", {
    onClick: props.onUndo,
    className: "text-sm font-medium cursor-pointer border-0 bg-transparent",
    style: {
      color: "var(--ink)",
      textDecoration: "underline",
      whiteSpace: "nowrap"
    }
  }, "Undo"), /*#__PURE__*/React.createElement("button", {
    onClick: props.onViewCart,
    className: "text-sm font-medium cursor-pointer border-0 bg-transparent",
    style: {
      color: "var(--teal)",
      textDecoration: "underline",
      whiteSpace: "nowrap"
    }
  }, "View cart"));
}