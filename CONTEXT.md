# EtherStar Jewels — domain glossary

**Saved address** — An address stored on the customer's account (`User.addresses`, up to 10, one marked default). The customer can always edit or delete it, even while orders are open. Shape and validation: `server/lib/address.js`.

**Order shipping address** — The copy of an address stored on an order (`Order.shippingAddress`) at checkout. It never changes afterwards: editing or deleting the saved address it came from does not affect orders already placed.

**Profile lock** — While any order is pending, confirmed, making or shipped, the customer's email and mobile cannot be changed, because the courier relies on them. Name, dates, preferences and saved addresses stay editable.
