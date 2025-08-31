  // ==== Setup Scanner ====
  let html5QrcodeScanner;

  // Start camera scanning
  document.getElementById("start-scan").addEventListener("click", () => {
    if (!html5QrcodeScanner) {
      html5QrcodeScanner = new Html5Qrcode("reader");
    }
    html5QrcodeScanner
      .start(
        { facingMode: "environment" }, // back camera
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          console.log("✅ Barcode detected:", decodedText);
          handleBarcode(decodedText);
          stopScanner(); // stop after first scan
        },
        (errorMsg) => {
          console.warn("Scan error:", errorMsg);
        }
      )
      .catch((err) => console.error("❌ Camera error:", err));
  });

  // Stop camera scanning
  document.getElementById("stop-scan").addEventListener("click", () => {
    stopScanner();
  });

  function stopScanner() {
    if (html5QrcodeScanner) {
      html5QrcodeScanner
        .stop()
        .then(() => {
          html5QrcodeScanner.clear();
        })
        .catch((err) => console.error("❌ Stop error:", err));
    }
  }

  // ==== Upload Barcode Image ====
  document.getElementById("barcode-file").addEventListener("change", (e) => {
    if (e.target.files.length === 0) return;
    const file = e.target.files[0];
    const html5Qr = new Html5Qrcode("reader");
    html5Qr
      .scanFile(file, true)
      .then((decodedText) => {
        console.log("✅ Decoded from image:", decodedText);
        handleBarcode(decodedText);
      })
      .catch((err) => {
        alert("❌ Could not read barcode from image. Try another one.");
        console.error("Decode error:", err);
      });
  });

  // ==== Manual Barcode Entry ====
  document.getElementById("search-barcode").addEventListener("click", () => {
    const code = document.getElementById("barcode-input").value.trim();
    if (code) {
      console.log("🔎 Manual input:", code);
      handleBarcode(code);
    } else {
      alert("⚠️ Please enter a barcode number!");
    }
  });

  // ==== Handle Barcode ====
  async function handleBarcode(barcode) {
    const loader = document.getElementById("loader");
    const nameEl = document.getElementById("product-name");
    const ecoScoreEl = document.getElementById("eco-score");

    // Reset UI
    loader.style.display = "block";
    nameEl.innerText = "🔎 Searching product...";
    ecoScoreEl.innerText = "-";
    ecoScoreEl.className = "eco-score";

    try {
      const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
      const res = await fetch(url);
      const data = await res.json();

      // Hide loader
      loader.style.display = "none";

      if (!data || data.status !== 1) {
        nameEl.innerText = "❌ Product not found.";
        ecoScoreEl.innerText = "-";
        ecoScoreEl.className = "eco-score";
        return;
      }

      const product = data.product;

      // ==== Product Info ====
      const brand = product.brands ? product.brands.split(",")[0] : "";
      const productName = product.product_name || "Unknown product";
      nameEl.innerText = `📦 ${brand ? brand + " - " : ""}${productName}`;

      // ==== Eco-Score (A–E) ====
      if (product.ecoscore_grade) {
        const grade = product.ecoscore_grade.toLowerCase();
        ecoScoreEl.innerText = grade.toUpperCase();

        switch (grade) {
          case "a":
            ecoScoreEl.className = "eco-score score-a";
            break;
          case "b":
            ecoScoreEl.className = "eco-score score-b";
            break;
          case "c":
            ecoScoreEl.className = "eco-score score-c";
            break;
          case "d":
            ecoScoreEl.className = "eco-score score-d";
            break;
          case "e":
            ecoScoreEl.className = "eco-score score-e";
            break;
          default:
            ecoScoreEl.className = "eco-score";
        }
      } else {
        ecoScoreEl.innerText = "Not available";
        ecoScoreEl.className = "eco-score";
      }
      setEcoExplanation(product);
    } catch (err) {
      console.error("❌ Error fetching product:", err);
      loader.style.display = "none";
      nameEl.innerText = "⚠️ Error fetching product info.";
      ecoScoreEl.innerText = "-";
      ecoScoreEl.className = "eco-score";
    }
  }

  // ==== Barcode Writer (Generate) ====
  document
    .getElementById("generate-barcode-btn")
    ?.addEventListener("click", () => {
      const inputVal = document.getElementById("barcode-input").value.trim();
      if (!inputVal) {
        alert("⚠️ Please enter text or numbers to generate a barcode!");
        return;
      }

      // Draw barcode into <svg>
      JsBarcode("#barcode-output", inputVal, {
        format: "CODE128",
        lineColor: "#000",
        width: 2,
        height: 60,
        displayValue: true,
      });
    });

    // ==== Eco-Score Explanation ====
function setEcoExplanation(product) {
  const explanationEl = document.getElementById("eco-explanation");
  let reasons = [];

  if (!product) {
    explanationEl.style.display = "none";
    return;
  }

  const grade = product.ecoscore_grade ? product.ecoscore_grade.toUpperCase() : null;

  if (grade === "A") {
    reasons.push("Excellent sustainability. Low environmental impact overall.");
  } else if (grade === "B") {
    reasons.push("Good score. Mostly eco-friendly, but some impact factors exist.");
  } else if (grade === "C") {
    reasons.push("Average eco-score. Contains moderate environmental concerns.");
  } else if (grade === "D") {
    reasons.push("Low eco-score. High environmental impact from sourcing or packaging.");
  } else if (grade === "E") {
    reasons.push("Very poor eco-score. Strong negative impact on the environment.");
  } else {
    reasons.push("Eco-Score not available for this product.");
  }

  // extra checks
  if (product.ingredients_analysis_tags?.includes("en:palm-oil")) {
    reasons.push("⚠️ Contains palm oil (linked to deforestation).");
  }
  if (product.packaging && product.packaging.toLowerCase().includes("plastic")) {
    reasons.push("⚠️ Packaging uses plastic.");
  }
  if (product.nutriments?.["saturated-fat_100g"] > 5) {
    reasons.push("⚠️ High in saturated fat.");
  }

  explanationEl.innerHTML = reasons.map(r => `• ${r}`).join("<br>");
  explanationEl.style.display = "block";
}
