const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const axios = require("axios");
const moment = require("moment");

/**
 * Helper function to get the full name of a customer by their ID from the auth service.
 * @param {string} customerId - The customer ID.
 * @param {string} token - The authorization token.
 * @returns {Promise<string>} The customer's full name or "(not available)" if not found.
 */
async function getCustomerName(customerId, token) {
  try {
    const resp = await axios.get(
      `${process.env.AUTH_URL}/users/${customerId}`,
      {
        headers: { Authorization: token },
      }
    );
    const user = resp.data;
    return `${user.name} ${user.lastName}`;
  } catch {
    return "(not available)";
  }
}

/**
 * Helper function to get a map of product IDs to product names from the inventory service.
 * @param {string} token - The authorization token.
 * @returns {Promise<Object>} A map of productId to productName.
 */
async function getProductMap(token) {
  try {
    const resp = await axios.get(`${process.env.INVENTORY_URL}/product`, {
      headers: { Authorization: token },
    });
    const map = {};
    resp.data.forEach((prod) => {
      map[prod.id] = prod.name;
    });
    return map;
  } catch {
    return {};
  }
}

/**
 * Generates a PDF report for a specific delivery.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
const generateDeliveryReport = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const token = req.headers.authorization;

    if (!deliveryId) {
      return res.status(400).json({ error: "deliveryId is required." });
    }

    // Obtener órdenes del microservicio de órdenes
    const ordersResponse = await axios.get(`${process.env.ORDERS_URL}/orders`, {
      headers: { Authorization: token },
    });

    let allOrders = ordersResponse.data.filter(
      (order) => order.deliveryId === deliveryId
    );

    // Obtener mapa de productos
    const productMap = await getProductMap(token);

    // Enriquecer órdenes con nombres de cliente y productos
    for (const order of allOrders) {
      // Nombre del cliente
      order.customerName = await getCustomerName(order.customerId, token);

      // Nombres de productos
      if (order.orderProducts && order.orderProducts.length > 0) {
        order.orderProducts.forEach((prod) => {
          prod.productName = productMap[prod.productId] || prod.productId;
        });
      }
    }

    const today = moment().startOf("day");

    const todayOrders = allOrders.filter((order) =>
      moment(order.estimatedDeliveryTime).isSame(today, "day")
    );

    const pendingOrders = allOrders.filter(
      (order) => order.status.toLowerCase() === "pending"
    );

    const completedOrders = allOrders.filter(
      (order) => order.status.toLowerCase() === "completed"
    );

    const totalOrders = allOrders.length;

    // Generar PDF
    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=report-${deliveryId}.pdf`
    );

    doc.pipe(res);

    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .text("Delivery Report", { align: "center" });
    doc.moveDown();
    doc.font("Helvetica-Bold").fontSize(14).text(`Delivery ID: ${deliveryId}`);
    doc
      .font("Helvetica")
      .text(`Report Date: ${moment().format("YYYY-MM-DD HH:mm")}`);
    doc.moveDown();

    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Summary", { underline: true });
    doc.moveDown();
    doc
      .font("Helvetica")
      .fontSize(12)
      .text(`- Pending Orders: ${pendingOrders.length}`);
    doc.text(`- Completed Orders: ${completedOrders.length}`);
    doc.text(`- Deliveries Scheduled Today: ${todayOrders.length}`);
    doc.text(`- Total Orders: ${totalOrders}`);
    doc.moveDown();

    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Today's Deliveries", { underline: true });

    if (todayOrders.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(12)
        .text("No deliveries scheduled for today.", { italic: true });
    } else {
      for (const [idx, order] of todayOrders.entries()) {
        doc.moveDown(0.5);
        doc
          .font("Helvetica-Bold")
          .fontSize(12)
          .text(`${idx + 1}. Order ID: ${order.id}`);
        doc
          .font("Helvetica-Bold")
          .text(`   Tracking Code: `, { continued: true });
        doc.font("Helvetica").text(`${order.trackingCode || "-"}`);
        doc
          .font("Helvetica-Bold")
          .text(`   Customer ID: `, { continued: true });
        doc.font("Helvetica").text(`${order.customerId || "-"}`);
        doc
          .font("Helvetica-Bold")
          .text(`   Customer Name: `, { continued: true });
        doc.font("Helvetica").text(`${order.customerName || "-"}`);
        doc.font("Helvetica-Bold").text(`   Address: `, { continued: true });
        doc.font("Helvetica").text(`${order.deliveryAddress || "-"}`);
        doc.font("Helvetica-Bold").text(`   Status: `, { continued: true });
        doc.font("Helvetica").text(`${order.status}`);
        doc.font("Helvetica-Bold").text(`   Amount: `, { continued: true });
        doc.font("Helvetica").text(`$${order.totalAmount || "-"}`);
        doc.font("Helvetica-Bold").text(`   Products:`);
        if (order.orderProducts && order.orderProducts.length > 0) {
          order.orderProducts.forEach((prod) => {
            doc
              .font("Helvetica")
              .text(
                `      - ${prod.productName || prod.productId} x${
                  prod.quantity
                }`
              );
          });
        } else {
          doc.font("Helvetica").text("      (No products)");
        }
        doc.moveDown(0.5);
      }
    }

    doc.end();
  } catch (error) {
    console.error("Error generating PDF report:", error);
    res.status(500).json({ error: "Failed to generate report." });
  }
};

/**
 * Enriches orders with customer names and product names.
 * @param {Array} orders - Array of order objects.
 * @param {Object} productMap - Map of product IDs to product names.
 * @param {string} token - Authorization token for API requests.
 * @return {Promise<void>}
 * */
async function enrichOrdersWithDetails(orders, productMap, token) {
  for (const order of orders) {
    order.customerName = await getCustomerName(order.customerId, token);

    if (
      Array.isArray(order.orderProducts) &&
      order.orderProducts.length > 0
    ) {
      order.orderProducts.forEach((prod) => {
        prod.productName = productMap[prod.productId] || prod.productId;
      });
    } else {
      order.orderProducts = [];
    }
  }
}

/**
 * Adds today's deliveries to the provided Excel sheet.
 * @param {ExcelJS.Worksheet} sheet - The Excel worksheet to add data to.
 * @param {Array} todayOrders - Array of today's order objects.
 * @return {void}
 * */
function addTodayDeliveriesToSheet(sheet, todayOrders) {
  sheet.addRow(["Today's Deliveries"]);
  sheet.getRow(sheet.lastRow.number).font = { bold: true };

  sheet.addRow([
    "Order ID",
    "Tracking Code",
    "Customer Name",
    "Delivery Address",
    "Status",
    "Amount",
    "Products",
  ]);
  sheet.getRow(sheet.lastRow.number).font = { bold: true };

  for (const order of todayOrders) {
    const productsStr =
      order.orderProducts && order.orderProducts.length > 0
        ? order.orderProducts
            .map((p) => `${p.productName} x${p.quantity}`)
            .join(", ")
        : "(No products)";

    sheet.addRow([
      order.id,
      order.trackingCode || "-",
      order.customerName || "-",
      order.deliveryAddress || "-",
      order.status,
      order.totalAmount != null ? `$${order.totalAmount}` : "-",
      productsStr,
    ]);
  }

  sheet.columns.forEach((col) => {
    if (col.header && typeof col.header === "string") {
      col.width = col.header.length < 20 ? 20 : col.header.length + 5;
    } else {
      col.width = 20;
    }
  });
}

/**
 * Generates a delivery report in XLSX format.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
async function generateDeliveryReportXlsx(req, res) {
  try {
    const { deliveryId } = req.params;
    const token = req.headers.authorization;

    if (!deliveryId) {
      return res.status(400).json({ error: "deliveryId is required." });
    }

    const ordersResponse = await axios.get(`${process.env.ORDERS_URL}/orders`, {
      headers: { Authorization: token },
    });

    let allOrders = ordersResponse.data.filter(
      (order) => order.deliveryId === deliveryId
    );

    const productMap = await getProductMap(token);

    await enrichOrdersWithDetails(allOrders, productMap, token);

    const today = moment().startOf("day");
    const todayOrders = allOrders.filter((order) =>
      moment(order.estimatedDeliveryTime).isSame(today, "day")
    );
    const pendingOrders = allOrders.filter(
      (order) => order.status.toLowerCase() === "pending"
    );
    const completedOrders = allOrders.filter(
      (order) => order.status.toLowerCase() === "completed"
    );
    const totalOrders = allOrders.length;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Delivery Report");

    sheet.mergeCells("A1", "E1");
    sheet.getCell("A1").value = `Delivery Report - Delivery ID: ${deliveryId}`;
    sheet.getCell("A1").font = { size: 16, bold: true };
    sheet.addRow([]);
    sheet.addRow(["Report Date:", moment().format("YYYY-MM-DD HH:mm:ss")]);
    sheet.addRow([]);

    sheet.addRow(["Summary"]);
    sheet.getRow(sheet.lastRow.number).font = { bold: true };
    sheet.addRow(["Pending Orders", pendingOrders.length]);
    sheet.addRow(["Completed Orders", completedOrders.length]);
    sheet.addRow(["Deliveries Scheduled Today", todayOrders.length]);
    sheet.addRow(["Total Orders", totalOrders]);
    sheet.addRow([]);

    if (todayOrders.length === 0) {
      sheet.addRow(["No deliveries scheduled for today."]);
      sheet.getRow(sheet.lastRow.number).font = { italic: true };
      sheet.addRow([]);
    } else {
      addTodayDeliveriesToSheet(sheet, todayOrders);
    }

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=delivery-report-${deliveryId}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating XLSX report:", error);
    res.status(500).json({ error: "Failed to generate XLSX report." });
  }
}

module.exports = { generateDeliveryReport, generateDeliveryReportXlsx };
