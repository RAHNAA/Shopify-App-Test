const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = 3000;

// Middleware to parse JSON request bodies
app.use(cors({ origin: "*" }));
app.use(express.json());

const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

// Fetch a single product by ID
app.get("/product/:productId", async (req, res) => {
  const { productId } = req.params;
  try {
    const response = await axios.get(
      `https://${SHOPIFY_STORE}/admin/api/2023-10/products/${productId}.json`,
      {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );
    res.json(response.data.product);
  } catch (error) {
    res.status(500).json({ error: "Product not found or invalid ID" });
  }
});

// Retrieve the current gift wrapping and warranty add-ons from the metafields
app.get("/product/:productId/addons", async (req, res) => {
  const { productId } = req.params;

  try {
    const response = await axios.get(
      `https://${SHOPIFY_STORE}/admin/api/2023-10/products/${productId}/metafields.json`,
      {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    // Find the gift wrapping and warranty metafields
    const giftWrapping = response.data.metafields.find(
      (mf) => mf.key === "gift__wrapping"
    );
    const _warranty = response.data.metafields.find(
      (mf) => mf.key === "_warranty"
    );

    const addons = {
      gift__wrapping: giftWrapping ? giftWrapping.value === "true" : false,
      _warranty: _warranty ? _warranty.value === "true" : false,
    };

    res.json({ addons });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update the selected add-on (gift wrapping or warranty) in the product's metafields
app.post("/product/:productId/addons", async (req, res) => {
  const { productId } = req.params;
  const { addonKey, addonValue } = req.body; // addonValue will be true or false

  try {
    console.log("Received addon data:", addonKey, addonValue);

    // Fetch current metafields for the product
    const metaffieldsResponse = await axios.get(
      `https://${SHOPIFY_STORE}/admin/api/2023-10/products/${productId}/metafields.json`,
      {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Metafields for product:", metaffieldsResponse.data);

    // Find the individual metafields (gift__wrapping and _warranty)
    const existingGiftWrappingMetafield = metaffieldsResponse.data.metafields.find(
      (mf) => mf.key === "gift__wrapping" && mf.namespace === "custom"
    );
    const existingWarrantyMetafield = metaffieldsResponse.data.metafields.find(
      (mf) => mf.key === "_warranty" && mf.namespace === "custom"
    );

    let response;

    if (addonKey === "gift__wrapping" && existingGiftWrappingMetafield) {
      console.log("Updating gift__wrapping metafield...");
      response = await axios.put(
        `https://${SHOPIFY_STORE}/admin/api/2023-10/metafields/${existingGiftWrappingMetafield.id}.json`,
        {
          metafield: {
            value: addonValue.toString(), // Convert to string "true" or "false"
            type: "boolean",  // Ensure the type is boolean
          },
        },
        {
          headers: {
            "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
            "Content-Type": "application/json",
          },
        }
      );
    } else if (addonKey === "_warranty" && existingWarrantyMetafield) {
      console.log("Updating warranty metafield...");
      response = await axios.put(
        `https://${SHOPIFY_STORE}/admin/api/2023-10/metafields/${existingWarrantyMetafield.id}.json`,
        {
          metafield: {
            value: addonValue.toString(), // Convert to string "true" or "false"
            type: "boolean",  // Ensure the type is boolean
          },
        },
        {
          headers: {
            "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
            "Content-Type": "application/json",
          },
        }
      );
    } else {
      // If the metafield doesn't exist, create a new one
      console.log("Creating new metafield...");
      const newMetafieldData = {
        namespace: "custom",
        value: addonValue.toString(), // Set the value as string "true" or "false"
        type: "boolean", // Type should be boolean
      };

      if (addonKey === "gift__wrapping") {
        response = await axios.post(
          `https://${SHOPIFY_STORE}/admin/api/2023-10/products/${productId}/metafields.json`,
          {
            metafield: {
              ...newMetafieldData,
              key: "gift__wrapping",
            },
          },
          {
            headers: {
              "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
              "Content-Type": "application/json",
            },
          }
        );
      } else if (addonKey === "_warranty") {
        response = await axios.post(
          `https://${SHOPIFY_STORE}/admin/api/2023-10/products/${productId}/metafields.json`,
          {
            metafield: {
              ...newMetafieldData,
              key: "_warranty",
            },
          },
          {
            headers: {
              "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    res.json({ message: "Add-on updated successfully", data: response.data });
  } catch (error) {
    console.error("Error in updating metafield:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
