/* 
1. Registrar usuario
2. Verificar email (mockeado)
3. Login (obtener token)
4. Crear pedido
5. Asignar repartidor (mock)
6. Registrar ubicación
7. Consultar ubicaciones cercanas
*/

const request = require("supertest");

const apiGateway = process.env.GATEWAY_URL || "http://localhost:3000";

let authToken;
let userId;
let orderId;

describe("E2E - Pedido y ubicación", () => {
    jest.setTimeout(20000);
    const uniqueEmail = `test+${Date.now()}@delivery.com`;
    const uniqueOrderId = `order-${Date.now()}`;

    it("1. Register new user", async () => {
        const res = await request(apiGateway)
            .post("/auth/auth/signup")
            .send({
                email: uniqueEmail,
                password: "Test123!",
                name: "John",
                lastName: "Doe",
                phone: "+573001112233",
                roleId: "4d36f126-e3c0-4740-8ef0-215dbf71733f",
            });
        expect(res.statusCode).toBe(201);
        userId = res.body.userId;
    });

    it("2. Mock verify email manually", async () => {
        const res = await request(apiGateway)
            .post("/auth/auth/verify-email")
            .send({
                email: uniqueEmail,
                code: "123456"
            });
        expect(res.statusCode).toBe(200);
    });

    it("3. Login and receive token", async () => {
        const res = await request(apiGateway)
            .post("/auth/auth/signin")
            .send({
                email: uniqueEmail,
                password: "Test123!",
                method: "email"
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.email).toBe(uniqueEmail);
    });

    it("4. Verify 2FA and get final token", async () => {
        const res = await request(apiGateway)
            .post("/auth/auth/verify-two-factor")
            .send({
                email: uniqueEmail,
                code: "123456" // mockeado
            });

        expect(res.statusCode).toBe(200);
        authToken = res.body.token;
    });

    it("5. Create an order", async () => {
        const res = await request(apiGateway)
            .post("/orders/orders")
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                id: uniqueOrderId,
                customerId: userId,
                deliveryId: "dp001",
                status: "PENDING",
                deliveryAddress: "Cra 45 # 123-45, Medellín",
                estimatedDeliveryTime: "2025-05-20T16:00:00Z",
                totalAmount: 240000
            });

        expect(res.statusCode).toBe(201);
        orderId = res.body.id;
    });

    it("6. Post delivery location", async () => {
        const res = await request(apiGateway)
            .post("/geo/locations")
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                deliveryPersonId: userId,
                orderId,
                location: {
                    type: "Point",
                    coordinates: [-75.5636, 6.2518]
                }
            });

        expect(res.statusCode).toBe(201);
    });

    it("7. Get nearby locations", async () => {
        const res = await request(apiGateway)
            .get("/geo/locations/near")
            .set("Authorization", `Bearer ${authToken}`)
            .query({
                lat: 6.2518,
                lng: -75.5636,
                maxDistance: 1000
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
    });
});