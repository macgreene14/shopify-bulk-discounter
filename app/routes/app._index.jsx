import { useState, useCallback } from "react";
import { useActionData, useSubmit } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { Card, Layout, Page, Select, PageActions } from "@shopify/polaris";

// Action gets triggerd on form submit
// Update Variant pricing with new pricing by looping through product state and running mutation
export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  console.log("action triggered");

  /** @type {any} */
  const data = {
    ...Object.fromEntries(await request.formData()),
  };
  console.log("data", typeof data, data);
  const productJSON = JSON.parse(data.products);

  // Loop through products and variants
  for (const product of productJSON) {
    console.log("product", typeof product, product); //json
    // const productJSON = JSON.parse(product);

    for (const variant of product.variants) {
      const input = {
        id: variant.id,
        price: variant.newPrice, // Replace with the new price you want to set
      };

      // Call the GraphQL mutation with the input
      const response = await admin.graphql(
        `#graphql
          mutation updateProductVariant($input: ProductVariantInput!) {
            productVariantUpdate(input: $input) {
              product {
                id
              }
              productVariant {
                id
                price
              }
              userErrors {
                field
                message
              }
            }
          }`,
        {
          variables: {
            input,
          },
        }
      );

      const responseJson = await response.json();
      console.log(responseJson);
    }
  }

  // Return a response if needed
  return { message: "Product variants updated successfully" };
}

// Main Component
export default function Index() {
  // State
  const [selectedProducts, setSelectedProducts] = useState();
  const [discountSelect, setDiscountSelect] = useState("0.10"); //defaults to 10% discount
  const submit = useSubmit();
  const errors = useActionData() || {};

  // Handle Dropdown Input
  const handleSelectChange = useCallback(
    (value) => setDiscountSelect(value),
    []
  );

  // Handle AddDiscount Btn
  const handleAddDiscount = async () => {
    selectedProducts.forEach((product) => {
      product.variants.forEach((variant) => {
        const discount = parseFloat(discountSelect);
        const originalPrice = parseFloat(variant.price);
        const discountedPrice = originalPrice * (1 - discount);
        variant.newPrice = discountedPrice.toFixed(2);
      });
    });

    // submit products to backend for updating
    const data = {
      products: JSON.stringify(selectedProducts),
    };
    submit(data, { method: "post" });
  };

  // Pull up Resource Picker, set Product State
  async function selectProducts() {
    const products = await window.shopify.resourcePicker({
      type: "product",
      multiple: true,
      selectionIds: selectedProducts,
    });

    if (products) {
      // update state
      setSelectedProducts(products);
    } else {
      // if no product selected, return
      return;
    }
  }

  return (
    <Page>
      <ui-title-bar title="Bulk Discounter">
        {/* <button variant="primary" onClick={() => navigate("/app/qrcodes/new")}> */}
        <button variant="primary" onClick={selectProducts}>
          Select Products
        </button>
      </ui-title-bar>
      <Layout>
        {selectedProducts && selectedProducts.length > 0 ? (
          <Card>
            <table>
              <thead>
                <tr>
                  <th>Product Image</th>
                  <th>Product Title</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {selectedProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <img
                        src={product.images[0]?.originalSrc}
                        alt={product.title}
                        width="50"
                      />
                    </td>
                    <td>{product.title}</td>
                    <td>{product.variants[0].price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <p>No products selected.</p>
        )}
      </Layout>
      <Layout.Section>
        <Select
          label="Discount Amount"
          options={[
            { label: "10%", value: "0.10" },
            { label: "15%", value: "0.15" },
            { label: "20%", value: "0.20" },
          ]}
          onChange={handleSelectChange}
          value={discountSelect}
        />
        <PageActions
          primaryAction={{
            content: "Apply Discount",
            onAction: handleAddDiscount,
          }}
        />
      </Layout.Section>
    </Page>
  );
}
