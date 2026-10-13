/*
 * DM Clothing V2: storefront logic (NEWLY IMPLEMENTED).
 * Catalog -> filters -> cart (saved in localStorage) -> Paystack checkout.
 *
 * SECURITY: only the PUBLIC Paystack key (pk_...) ever goes in this file.
 * The SECRET key (sk_...) must never appear in frontend code. Orders should be
 * verified on a server before you ship anything. See README.
 */
(function () {
  "use strict";

  var PAYSTACK_PUBLIC_KEY = "pk_test_REPLACE_ME"; // public key only
  var CART_KEY = "dm_cart_v1";

  var products = window.DM_PRODUCTS || [];
  // Admin preview: index.html?preview=1 shows the unpublished draft saved by admin.html.
  // Normal visitors never see drafts.
  try {
    if (/[?&]preview=1\b/.test(location.search)) {
      var draft = JSON.parse(localStorage.getItem("dm_admin_draft_v1") || "null");
      if (Array.isArray(draft) && draft.length) products = draft;
    }
  } catch (e) { /* ignore */ }
  var activeCategory = "All";
  var selectedSize = {}; // productId -> size chosen on the card
  var cart = loadCart();

  var $ = function (id) { return document.getElementById(id); };
  var money = function (n) { return "₦" + Number(n).toLocaleString("en-NG"); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  /* ---------- cart storage ---------- */
  function loadCart() {
    try {
      var raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) { return []; }
  }
  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* storage blocked */ }
  }
  function findProduct(id) {
    for (var i = 0; i < products.length; i++) if (products[i].id === id) return products[i];
    return null;
  }

  /* ---------- catalog ---------- */
  function renderFilters() {
    var cats = ["All"];
    products.forEach(function (p) { if (cats.indexOf(p.category) === -1) cats.push(p.category); });
    $("filters").innerHTML = cats.map(function (c) {
      return '<button class="chip' + (c === activeCategory ? " active" : "") + '" data-cat="' + esc(c) + '">' + esc(c) + "</button>";
    }).join("");
  }

  function cardHTML(p) {
    var size = selectedSize[p.id] || p.sizes[0];
    var media = p.image
      ? '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">'
      : '<span class="monogram" aria-hidden="true">DM</span>';
    var badge = !p.available ? '<span class="badge">Sold out</span>'
              : p.featured ? '<span class="badge">Featured</span>' : "";
    var sizes = p.sizes.map(function (s) {
      return '<button class="size' + (s === size ? " active" : "") + '" data-size="' + esc(s) + '" data-pid="' + esc(p.id) + '">' + esc(s) + "</button>";
    }).join("");
    return '<article class="card">' +
      '<div class="card-media">' + media + badge + "</div>" +
      '<div class="card-body">' +
        '<span class="card-cat">' + esc(p.category) + "</span>" +
        '<h3 class="card-title">' + esc(p.name) + "</h3>" +
        '<div class="card-price">' + money(p.price) + "</div>" +
        '<div class="sizes" role="group" aria-label="Size">' + sizes + "</div>" +
        '<button class="btn btn-gold" data-add="' + esc(p.id) + '"' + (p.available ? "" : " disabled") + ">" +
          (p.available ? "Add to cart" : "Sold out") + "</button>" +
      "</div></article>";
  }

  function renderGrid() {
    var list = products.filter(function (p) { return activeCategory === "All" || p.category === activeCategory; });
    $("productGrid").innerHTML = list.length ? list.map(cardHTML).join("") : '<p class="empty">No products in this category yet.</p>';
  }

  /* ---------- cart ---------- */
  function cartTotal() {
    return cart.reduce(function (sum, l) {
      var p = findProduct(l.id);
      return sum + (p ? p.price * l.qty : 0);
    }, 0);
  }

  function renderCart() {
    var count = cart.reduce(function (n, l) { return n + l.qty; }, 0);
    $("cartCount").textContent = count;
    $("cartTotal").textContent = money(cartTotal());

    if (!cart.length) {
      $("cartItems").innerHTML = '<p class="empty">Your cart is empty.</p>';
      return;
    }
    $("cartItems").innerHTML = cart.map(function (l, i) {
      var p = findProduct(l.id);
      if (!p) return "";
      return '<div class="line-item">' +
        "<div><h4>" + esc(p.name) + "</h4><small>Size: " + esc(l.size) + "</small></div>" +
        '<div class="line-price">' + money(p.price * l.qty) + "</div>" +
        '<div class="qty"><button data-dec="' + i + '" aria-label="Decrease">&minus;</button><span>' + l.qty +
          '</span><button data-inc="' + i + '" aria-label="Increase">+</button></div>' +
        '<button class="remove" data-rm="' + i + '">Remove</button></div>';
    }).join("");
  }

  function addToCart(id) {
    var p = findProduct(id);
    if (!p || !p.available) return;
    var size = selectedSize[id] || p.sizes[0];
    var existing = cart.filter(function (l) { return l.id === id && l.size === size; })[0];
    if (existing) existing.qty += 1; else cart.push({ id: id, size: size, qty: 1 });
    saveCart(); renderCart(); openDrawer();
  }

  function openDrawer() {
    $("drawer").classList.add("open");
    $("drawer").setAttribute("aria-hidden", "false");
    $("overlay").hidden = false;
  }
  function closeDrawer() {
    $("drawer").classList.remove("open");
    $("drawer").setAttribute("aria-hidden", "true");
    $("overlay").hidden = true;
  }

  /* ---------- checkout ---------- */
  function note(msg, isError) {
    var n = $("checkoutNote");
    n.textContent = msg;
    n.className = "note" + (isError ? " error" : "");
  }

  function checkout() {
    var email = $("checkoutEmail").value.trim();
    if (!cart.length) return note("Your cart is empty.", true);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return note("Enter a valid email for your receipt.", true);
    if (typeof window.PaystackPop === "undefined") return note("Payment script could not load. Check your connection.", true);
    if (PAYSTACK_PUBLIC_KEY.indexOf("REPLACE_ME") !== -1) return note("Checkout is not live yet: add your Paystack public key in js/app.js.", true);

    var handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: email,
      amount: cartTotal() * 100, // Paystack uses kobo
      currency: "NGN",
      ref: "DM" + Date.now(),
      metadata: { cart: cart },
      callback: function (res) {
        cart = []; saveCart(); renderCart();
        note("Payment received. Reference: " + res.reference);
      },
      onClose: function () { note("Payment window closed."); }
    });
    handler.openIframe();
  }

  /* ---------- events (one delegated listener each) ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;

    var cat = t.closest("[data-cat]");
    if (cat) { activeCategory = cat.getAttribute("data-cat"); renderFilters(); renderGrid(); return; }

    var size = t.closest("[data-size]");
    if (size) { selectedSize[size.getAttribute("data-pid")] = size.getAttribute("data-size"); renderGrid(); return; }

    var add = t.closest("[data-add]");
    if (add) { addToCart(add.getAttribute("data-add")); return; }

    var inc = t.closest("[data-inc]"), dec = t.closest("[data-dec]"), rm = t.closest("[data-rm]");
    if (inc) { cart[+inc.getAttribute("data-inc")].qty += 1; }
    else if (dec) {
      var i = +dec.getAttribute("data-dec");
      cart[i].qty -= 1;
      if (cart[i].qty < 1) cart.splice(i, 1);
    } else if (rm) { cart.splice(+rm.getAttribute("data-rm"), 1); }
    else return;
    saveCart(); renderCart();
  });

  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });

  /* ---------- start ---------- */
  function init() {
    // Drop any cart lines for products that no longer exist.
    cart = cart.filter(function (l) { return findProduct(l.id) && l.qty > 0; });
    $("year").textContent = new Date().getFullYear();
    $("cartOpen").addEventListener("click", openDrawer);
    $("cartClose").addEventListener("click", closeDrawer);
    $("overlay").addEventListener("click", closeDrawer);
    $("checkoutBtn").addEventListener("click", checkout);
    renderFilters(); renderGrid(); renderCart();
    console.log("DM Clothing: " + products.length + " products loaded");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
