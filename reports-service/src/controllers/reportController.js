const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const axios = require("axios");
const moment = require("moment");

// Función auxiliar para obtener el nombre del cliente
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

// Función auxiliar para obtener el mapa de productos
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

    // ...existing code...

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

async function generateDeliveryReportXlsx(req, res) {
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
      order.customerName = await getCustomerName(order.customerId, token);

      if (
        Array.isArray(order.orderProducts) &&
        order.orderProducts.length > 0
      ) {
        order.orderProducts.forEach((prod) => {
          prod.productName = productMap[prod.productId] || prod.productId;
        });
      } else {
        // Asegura que orderProducts al menos sea un arreglo vacío para evitar errores posteriores
        order.orderProducts = [];
      }
    }

    // Filtrar por estados y fechas como en PDF
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

    // Crear workbook y worksheet
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Delivery Report");

    // Títulos y formato inicial
    sheet.mergeCells("A1", "E1");
    sheet.getCell("A1").value = `Delivery Report - Delivery ID: ${deliveryId}`;
    sheet.getCell("A1").font = { size: 16, bold: true };
    sheet.addRow([]);
    sheet.addRow(["Report Date:", moment().format("YYYY-MM-DD HH:mm:ss")]);
    sheet.addRow([]);

    // Summary Section
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
      // Today's Deliveries Section
      sheet.addRow(["Today's Deliveries"]);
      sheet.getRow(sheet.lastRow.number).font = { bold: true };

      // Header for today deliveries table
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

      // Fill orders of today
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

      // Ajustar ancho columnas
      sheet.columns.forEach((col) => {
        if (col.header && typeof col.header === "string") {
          col.width = col.header.length < 20 ? 20 : col.header.length + 5;
        } else {
          col.width = 20; // Valor por defecto si no hay header
        }
      });
    }

    // Enviar XLSX al cliente
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
