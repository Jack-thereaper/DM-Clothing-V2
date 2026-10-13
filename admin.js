/*
 * DM Clothing V2: admin catalog manager (NEWLY IMPLEMENTED).
 *
 * How it works: it loads the published catalog (js/products.js), lets you edit it,
 * keeps your draft in this browser's localStorage, and exports a new products.js.
 * It cannot change the live site by itself. You publish by replacing js/products.js
 * and pushing to GitHub. That also means this page needs no password: visitors can
 * open it, but nothing they do here reaches your customers.
 */
(function () {
  "use strict";

  var DRAFT_KEY = "dm_admin_draft_v1";
  var published = clone(window.DM_PRODUCTS || []);
  var items = loadDraft() || clone(published);
  var editingId = null; // null = adding
  var pendingDelete = null;
  var lastFocus = null;

  var $ = function (id) { return document.getElementById(id); };
  var money = function (n) { return "₦" + Number(n).toLocaleString("en-NG"); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  /* ---------- storage ---------- */
  function loadDraft() {
    try {
      var d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      return Array.isArray(d) ? d : null;
    } catch (e) { return null; }
  }
  function saveDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(items)); }
    catch (e) { toast("Could not save draft (browser storage blocked)"); }
  }
  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
  }
  function isDirty() { return JSON.stringify(items) !== JSON.stringify(published); }

  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  /* ---------- rendering ---------- */
  function categories() {
    var c = [];
    items.forEach(function (p) { if (c.indexOf(p.category) === -1) c.push(p.category); });
    return c;
  }

  function renderStats() {
    var inStock = items.filter(function (p) { return p.available; }).length;
    var featured = items.filter(function (p) { return p.featured; }).length;
    var stats = [
      ["Products", items.length], ["In stock", inStock],
      ["Sold out", items.length - inStock], ["Featured", featured]
    ];
    $("stats").innerHTML = stats.map(function (s) {
      return '<div class="stat"><b>' + s[1] + "</b><span>" + s[0] + "</span></div>";
    }).join("");
  }

  function renderFilter() {
    var sel = $("catFilter"), cur = sel.value || "All";
    var opts = ["All"].concat(categories());
    if (opts.indexOf(cur) === -1) cur = "All";
    sel.innerHTML = opts.map(function (c) {
      return '<option value="' + esc(c) + '"' + (c === cur ? " selected" : "") + ">" + esc(c) + "</option>";
    }).join("");
    $("catList").innerHTML = categories().map(function (c) { return '<option value="' + esc(c) + '">'; }).join("");
  }

  function renderRows() {
    var q = $("search").value.trim().toLowerCase();
    var cat = $("catFilter").value || "All";
    var list = items.filter(function (p) {
      return (cat === "All" || p.category === cat) &&
             (!q || (p.name + " " + p.id).toLowerCase().indexOf(q) !== -1);
    });
    $("emptyMsg").hidden = list.length > 0;
    $("rows").innerHTML = list.map(function (p) {
      var thumb = p.image
        ? '<img class="thumb" src="' + esc(p.image) + '" alt="">'
        : '<span class="thumb">DM</span>';
      return "<tr>" +
        '<td><div class="pcell">' + thumb + '<div><div class="pname">' + esc(p.name) + '</div><div class="pid">' + esc(p.id) + "</div></div></div></td>" +
        "<td>" + esc(p.category) + "</td>" +
        '<td class="price">' + money(p.price) + "</td>" +
        "<td>" + esc(p.sizes.join(", ")) + "</td>" +
        "<td>" + switchHTML("available", p) + "</td>" +
        "<td>" + switchHTML("featured", p) + "</td>" +
        '<td class="row-actions"><button data-edit="' + esc(p.id) + '">Edit</button><button class="del" data-del="' + esc(p.id) + '">Delete</button></td>' +
        "</tr>";
    }).join("");
  }

  function switchHTML(field, p) {
    return '<label class="switch"><input type="checkbox" data-toggle="' + field + '" data-id="' + esc(p.id) + '"' +
      (p[field] ? " checked" : "") + ' aria-label="' + (field === "available" ? "In stock" : "Featured") + ": " + esc(p.name) + '">' +
      '<span class="slider"></span></label>';
  }

  function render() {
    renderStats(); renderFilter(); renderRows();
    $("draftNotice").hidden = !isDirty();
  }

  function commit(msg) {
    saveDraft(); render();
    if (msg) toast(msg);
  }

  function find(id) {
    for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i];
    return null;
  }

  /* ---------- add / edit modal ---------- */
  function slug(s) {
    return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function openModal(id) {
    lastFocus = document.activeElement;
    editingId = id;
    var p = id ? find(id) : null;
    $("modalTitle").textContent = p ? "Edit product" : "Add product";
    $("fName").value = p ? p.name : "";
    $("fId").value = p ? p.id : "";
    $("fId").readOnly = !!p;
    $("fCategory").value = p ? p.category : "";
    $("fPrice").value = p ? p.price : "";
    $("fSizes").value = p ? p.sizes.join(", ") : "S, M, L, XL";
    $("fImage").value = p ? p.image : "";
    $("fAvailable").checked = p ? p.available : true;
    $("fFeatured").checked = p ? p.featured : false;
    $("fFile").value = "";
    $("formError").textContent = "";
    $("modal").hidden = false;
    $("fName").focus();
  }

  function closeModal() {
    $("modal").hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function submitForm(e) {
    e.preventDefault();
    var name = $("fName").value.trim();
    var id = editingId || ($("fId").value.trim() || slug(name));
    var category = $("fCategory").value.trim();
    var price = Number($("fPrice").value);
    var sizes = $("fSizes").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    var image = $("fImage").value.trim();
    var err = "";

    if (!name) err = "Enter a product name.";
    else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) err = "Product ID may use only lowercase letters, numbers and single dashes.";
    else if (!editingId && find(id)) err = "That product ID already exists. Choose a different one.";
    else if (!category) err = "Enter a category.";
    else if (!isFinite(price) || price < 1 || Math.floor(price) !== price) err = "Price must be a whole number of naira, 1 or more.";
    else if (!sizes.length) err = "Enter at least one size.";
    else if (/^(https?:)?\/\/|^javascript:/i.test(image)) err = "Use a path inside your project, like images/photo.jpg.";
    if (err) { $("formError").textContent = err; return; }

    var data = {
      id: id, name: name, category: category, price: price, sizes: sizes, image: image,
      featured: $("fFeatured").checked, available: $("fAvailable").checked,
      placeholder: false
    };
    if (editingId) {
      var old = find(editingId);
      data.placeholder = old.placeholder && old.price === price && old.name === name ? old.placeholder : false;
      items[items.indexOf(old)] = data;
    } else {
      items.push(data);
    }
    closeModal();
    commit(editingId ? "Product updated" : "Product added");
  }

  /* ---------- delete ---------- */
  function askDelete(id) {
    var p = find(id);
    if (!p) return;
    lastFocus = document.activeElement;
    pendingDelete = id;
    $("confirmText").textContent = 'Delete "' + p.name + '" from the catalog? (You can discard all changes later if you change your mind before publishing.)';
    $("confirmBox").hidden = false;
    $("confirmNo").focus();
  }
  function closeConfirm() {
    $("confirmBox").hidden = true;
    pendingDelete = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- export ---------- */
  function buildFile() {
    var header = "/*\n * DM Clothing V2: product catalog.\n * Exported from the admin page on " + new Date().toISOString().slice(0, 10) + ".\n" +
      " * Prices are in naira (whole numbers). Leave image as \"\" for the gold DM monogram.\n */\n";
    var lines = items.map(function (p) {
      return "  " + JSON.stringify({
        id: p.id, name: p.name, category: p.category, price: p.price, sizes: p.sizes,
        image: p.image, featured: !!p.featured, available: !!p.available, placeholder: !!p.placeholder
      });
    });
    return header + "window.DM_PRODUCTS = [\n" + lines.join(",\n") + "\n];\n";
  }

  function exportFile() {
    if (!items.length) { toast("Nothing to export: the catalog is empty"); return; }
    var blob = new Blob([buildFile()], { type: "text/javascript" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "products.js";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast("products.js downloaded. Replace js/products.js, then commit and push.");
  }

  /* ---------- events ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    var ed = t.closest("[data-edit]"), del = t.closest("[data-del]");
    if (ed) openModal(ed.getAttribute("data-edit"));
    else if (del) askDelete(del.getAttribute("data-del"));
  });

  document.addEventListener("change", function (e) {
    var t = e.target;
    if (!(t instanceof Element) || !t.hasAttribute("data-toggle")) return;
    var p = find(t.getAttribute("data-id"));
    if (!p) return;
    p[t.getAttribute("data-toggle")] = t.checked;
    commit();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!$("confirmBox").hidden) closeConfirm();
    else if (!$("modal").hidden) closeModal();
  });

  $("addBtn").addEventListener("click", function () { openModal(null); });
  $("modalClose").addEventListener("click", closeModal);
  $("cancelBtn").addEventListener("click", closeModal);
  $("modal").addEventListener("mousedown", function (e) { if (e.target === $("modal")) closeModal(); });
  $("form").addEventListener("submit", submitForm);
  $("fName").addEventListener("input", function () {
    if (!editingId) $("fId").value = slug($("fName").value);
  });
  $("fFile").addEventListener("change", function () {
    var f = this.files && this.files[0];
    if (f) $("fImage").value = "images/" + f.name.replace(/\s+/g, "-").toLowerCase();
  });

  $("confirmNo").addEventListener("click", closeConfirm);
  $("confirmYes").addEventListener("click", function () {
    var p = find(pendingDelete);
    if (p) items.splice(items.indexOf(p), 1);
    closeConfirm();
    commit("Product deleted");
  });

  $("search").addEventListener("input", renderRows);
  $("catFilter").addEventListener("change", renderRows);
  $("exportBtn").addEventListener("click", exportFile);
  $("discardBtn").addEventListener("click", function () {
    if (!window.confirm("Throw away all unpublished changes and go back to the published catalog?")) return;
    items = clone(published); clearDraft(); render(); toast("Changes discarded");
  });

  render();
})();
