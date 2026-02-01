# Delivery Service

The Delivery Service is a microservice responsible for managing delivery tracking for SewNova orders. It handles both vendor fabric dispatch to tailors and tailor delivery to customers.

## Features

- **Vendor Dispatch Tracking**: Track fabric shipments from vendors to tailors
- **Tailor Delivery Tracking**: Track garment delivery from tailors to customers
- **Status History**: Complete timeline of delivery status updates
- **Multi-role Access**: Different access levels for vendors, tailors, customers, and admins
- **Real-time Updates**: Status updates are immediately reflected across the system

## Architecture

### Models

#### Delivery Model
- `bookingId`: Reference to the booking/order
- `customerId`: Reference to the customer
- `bookingType`: Type of booking (tailor, fabric, complete)
- `vendorDispatch`: Vendor dispatch tracking details
  - status, trackingNumber, courierName, estimatedDelivery, notes
- `tailorDelivery`: Tailor delivery tracking details
  - status, deliveryMethod, trackingNumber, courierName, notes, failureReason
- `deliveryAddress`: Snapshot of delivery address
- `overallStatus`: Computed overall delivery status
- `statusHistory`: Timeline of all status changes

### API Endpoints

#### Public Endpoints
- `POST /api/deliveries` - Create delivery record (internal use)

#### Customer Endpoints
- `GET /api/deliveries/customer/:customerId` - Get all customer deliveries
- `GET /api/deliveries/tracking/:bookingId` - Get tracking information

#### Vendor Endpoints
- `PUT /api/deliveries/:id/vendor-dispatch` - Update vendor dispatch status

#### Tailor Endpoints
- `PUT /api/deliveries/:id/tailor-delivery` - Update tailor delivery status

#### Admin Endpoints
- `GET /api/deliveries/admin/all` - Get all deliveries with filters

#### Common Endpoints
- `GET /api/deliveries/booking/:bookingId` - Get delivery by booking ID
- `GET /api/deliveries/:id/history` - Get delivery status history

## Status Flow

### Vendor Dispatch Statuses
1. `pending` - Waiting for vendor to dispatch
2. `dispatched` - Fabric has been dispatched
3. `in_transit` - Fabric is in transit to tailor
4. `delivered_to_tailor` - Fabric delivered to tailor

### Tailor Delivery Statuses
1. `pending` - Waiting for tailor to start
2. `ready_for_delivery` - Garment is ready for delivery
3. `out_for_delivery` - Garment is out for delivery
4. `delivered` - Garment delivered to customer
5. `failed` - Delivery failed (with reason)

### Overall Statuses
- `pending` - No activity yet
- `in_progress` - Active delivery process
- `delivered` - Successfully delivered
- `failed` - Delivery failed

## Environment Variables

```env
PORT=3008
NODE_ENV=development
MONGODB_URI=<your-mongodb-uri>
JWT_SECRET=<your-jwt-secret>
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=info
```

## Running the Service

### Development
```bash
cd backend/delivery-service
npm install
npm run dev
```

### Production
```bash
npm start
```

### Docker
```bash
docker-compose up delivery-service
```

## Integration

### Creating a Delivery Record
When a booking is confirmed, create a delivery record:

```javascript
const delivery = await deliveryService.createDelivery(
  bookingId,
  customerId,
  bookingType,
  deliveryAddress
);
```

### Updating Vendor Dispatch
Vendors update fabric dispatch status:

```javascript
await deliveryService.updateVendorDispatch(deliveryId, {
  status: 'dispatched',
  trackingNumber: 'TRACK123',
  courierName: 'Blue Dart',
  estimatedDelivery: '2026-01-30',
  notes: 'Dispatched via express delivery'
});
```

### Updating Tailor Delivery
Tailors update delivery status:

```javascript
await deliveryService.updateTailorDelivery(deliveryId, {
  status: 'out_for_delivery',
  deliveryMethod: 'courier',
  trackingNumber: 'TRACK456',
  courierName: 'DTDC',
  notes: 'Out for delivery'
});
```

### Customer Tracking
Customers can track their orders:

```javascript
const tracking = await deliveryService.getDeliveryTracking(bookingId);
```

## Frontend Integration

### Pages
- **Tailor**: `/tailor/delivery/:bookingId` - Update delivery status
- **Vendor**: `/seller/dispatch` - Manage fabric dispatch
- **Customer**: `/customer/tracking` - Track order delivery
- **Admin**: `/admin/deliveries` - Monitor all deliveries

### Service Client
```javascript
import deliveryService from './services/deliveryService';

// Get tracking info
const tracking = await deliveryService.getDeliveryTracking(bookingId);

// Update status
await deliveryService.updateTailorDelivery(deliveryId, formData);
```

## Database Indexes

The following indexes are created for optimal query performance:
- `bookingId` (unique)
- `customerId + overallStatus`
- `vendorDispatch.status`
- `tailorDelivery.status`
- `createdAt` (descending)

## Security

- JWT-based authentication
- Role-based access control
- Vendors can only update vendor dispatch
- Tailors can only update tailor delivery
- Customers have read-only access
- Admins have full access

## Error Handling

The service includes comprehensive error handling:
- Validation errors (400)
- Authentication errors (401)
- Authorization errors (403)
- Not found errors (404)
- Server errors (500)

## Testing

```bash
npm test
```

## Monitoring

Health check endpoint:
```
GET /health
```

Response:
```json
{
  "status": "OK",
  "service": "Delivery Service",
  "timestamp": "2026-01-23T11:00:00.000Z"
}
```

## Future Enhancements

- SMS/Email notifications on status updates
- Integration with courier APIs for real-time tracking
- Delivery time estimation based on location
- Proof of delivery (photos, signatures)
- Delivery partner ratings
- Route optimization for hand delivery
