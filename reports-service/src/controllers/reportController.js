const PDFDocument = require("pdfkit");
const axios = require("axios");
const moment = require("moment");

// Función auxiliar para obtener el nombre del cliente
async function getCustomerName(customerId, token) {
    try {
        const resp = await axios.get(`${process.env.AUTH_URL}/users/${customerId}`, {
            headers: { Authorization: token }
        });
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
            headers: { Authorization: token }
        });
        const map = {};
        resp.data.forEach(prod => {
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
        const ordersResponse = await axios.get(
            `${process.env.ORDERS_URL}/orders`,
            {
                headers: { Authorization: token },
            }
        );

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
                order.orderProducts.forEach(prod => {
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

        doc.font("Helvetica-Bold").fontSize(20).text("Delivery Report", { align: "center" });
        doc.moveDown();
        doc.font("Helvetica-Bold").fontSize(14).text(`Delivery ID: ${deliveryId}`);
        doc.font("Helvetica").text(`Report Date: ${moment().format("YYYY-MM-DD HH:mm")}`);
        doc.moveDown();

        doc.font("Helvetica-Bold").fontSize(16).text("Summary", { underline: true });
        doc.moveDown();
        doc.font("Helvetica").fontSize(12).text(`- Pending Orders: ${pendingOrders.length}`);
        doc.text(`- Completed Orders: ${completedOrders.length}`);
        doc.text(`- Deliveries Scheduled Today: ${todayOrders.length}`);
        doc.text(`- Total Orders: ${totalOrders}`);
        doc.moveDown();

        doc.font("Helvetica-Bold").fontSize(16).text("Today's Deliveries", { underline: true });

        if (todayOrders.length === 0) {
            doc.font("Helvetica").fontSize(12).text("No deliveries scheduled for today.", { italic: true });
        } else {
            for (const [idx, order] of todayOrders.entries()) {
                doc.moveDown(0.5);
                doc.font("Helvetica-Bold").fontSize(12).text(`${idx + 1}. Order ID: ${order.id}`);
                doc.font("Helvetica-Bold").text(`   Tracking Code: `, { continued: true });
                doc.font("Helvetica").text(`${order.trackingCode || "-"}`);
                doc.font("Helvetica-Bold").text(`   Customer ID: `, { continued: true });
                doc.font("Helvetica").text(`${order.customerId || "-"}`);
                doc.font("Helvetica-Bold").text(`   Customer Name: `, { continued: true });
                doc.font("Helvetica").text(`${order.customerName || "-"}`);
                doc.font("Helvetica-Bold").text(`   Address: `, { continued: true });
                doc.font("Helvetica").text(`${order.deliveryAddress || "-"}`);
                doc.font("Helvetica-Bold").text(`   Status: `, { continued: true });
                doc.font("Helvetica").text(`${order.status}`);
                doc.font("Helvetica-Bold").text(`   Amount: `, { continued: true });
                doc.font("Helvetica").text(`$${order.totalAmount || "-"}`);
                doc.font("Helvetica-Bold").text(`   Products:`);
                if (order.orderProducts && order.orderProducts.length > 0) {
                    order.orderProducts.forEach(prod => {
                        doc.font("Helvetica").text(
                            `      - ${prod.productName || prod.productId} x${prod.quantity}`
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

module.exports = { generateDeliveryReport };