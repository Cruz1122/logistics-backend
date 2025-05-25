const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const {
  getAllDeliveryPersons,
  getDeliveryPersonById,
  createDeliveryPerson,
  updateDeliveryPerson,
  deleteDeliveryPerson,
  getDeliveryPersonByUserId,
} = require("../controllers/DeliveryPersonController");

/**
 * @swagger
 * tags:
 *   name: DeliveryPersons
 *   description: Endpoints for managing delivery personnel
 */

/**
 * @swagger
 * /delivery-persons:
 *   get:
 *     summary: Retrieve all delivery persons
 *     tags: [DeliveryPersons]
 *     responses:
 *       200:
 *         description: List of delivery persons
 *
 *   post:
 *     summary: Create a new delivery person
 *     tags: [DeliveryPersons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - idUser
 *               - name
 *             properties:
 *               id:
 *                 type: string
 *               idUser:
 *                 type: string
 *               name:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       201:
 *         description: Delivery person created successfully
 */

/**
 * @swagger
 * /delivery-persons/{id}:
 *   get:
 *     summary: Get delivery person by ID
 *     tags: [DeliveryPersons]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Delivery person found
 *       404:
 *         description: Not found
 *
 *   put:
 *     summary: Update delivery person
 *     tags: [DeliveryPersons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idUser:
 *                 type: string
 *               name:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       200:
 *         description: Delivery person updated
 *
 *   delete:
 *     summary: Delete delivery person
 *     tags: [DeliveryPersons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Delivery person deleted
 */

router.get(
  "/",
  authenticateJWT,
  authorize("Delivery-Person Management", "listar"),
  getAllDeliveryPersons
);

router.get(
  "/:id",
  authenticateJWT,
  authorize("Delivery-Person Management", "listar"),
  getDeliveryPersonById
);

router.get(
  "/user/:idUser",
  getDeliveryPersonByUserId
);

router.post(
  "/",
  authenticateJWT,
  authorize("Delivery-Person Management", "crear"),
  createDeliveryPerson
);

router.put(
  "/:id",
  authenticateJWT,
  authorize("Delivery-Person Management", "editar"),
  updateDeliveryPerson
);

router.delete(
  "/:id",
  authenticateJWT,
  authorize("Delivery-Person Management", "eliminar"),
  deleteDeliveryPerson
);

module.exports = router;
