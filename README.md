# CafeBites — working Producer–Consumer prototype

## Run it
1. Extract the ZIP.
2. Open `index.html` in a modern browser. No build tools or server are required.
3. Internet is not required; menu visuals use emoji, so they work offline.

## Try the lab
1. Add menu items to the tablet cart.
2. Press **Send order to kitchen**. The order is placed in the bounded shared buffer (capacity 3).
3. Place orders until all three slots are full. Try to place another: the producer is blocked by the `empty` condition.
4. Press **Prepare next** to consume the oldest order. This frees a slot.
5. Click **Run unsafe race**. The demo models multiple workers reading the same first order before removal, showing how duplicate preparation can happen without mutual exclusion.
6. Use **Reset lab** to start over.

## OS concept mapping
- Producer: customer/tablet placing an order
- Consumer: kitchen preparing the oldest order
- Shared buffer: FIFO kitchen queue, maximum capacity 3
- `empty`: number of free slots; producer must not insert when it is 0
- `full`: number of queued orders; consumer must not remove when it is 0
- Mutex: guards the queue's critical section so only one queue mutation is performed at a time
- Race condition: unsafe demo intentionally lets multiple workers read the same order before removal

## Important limitation
This is a client-side learning simulation, not a production ordering system. It does not use real parallel threads, a server, database, real payment, or cross-device synchronization. JavaScript UI actions run on one event loop. The race condition is deliberately simulated to make the failure mode visible. For a true multi-device prototype, use a backend API and a server-side queue with atomic locking/transactions.
