# SCS StudioHub — Easy Setup Edition

A purple-and-white full-stack business management application with a React frontend (HTML/CSS/JSX), an Express backend, and local persistent JSON data storage. **No Docker, PostgreSQL, or Prisma needed.**

## Requirements
- Node.js 20 or later
- VS Code (optional)

## First-time setup
1. Extract the ZIP and open the **scs-studiohub** folder in VS Code.
2. Open a terminal in that folder.
3. Run `npm run setup` and wait for it to finish.
4. Run `npm run dev`.
5. Open http://localhost:5173 in your browser.

## Login for local testing
- Email: `admin@scs.local`
- Password: `ChangeMe123!`

**IMPORTANT:** The default login is only for local testing. Do not expose this application directly to the public internet or store sensitive real customer information without implementing production-grade security, backups, and account management.

## Everyday use
Open Docker? **No.** Just open a terminal in `scs-studiohub` and run `npm run dev`. Keep the terminal running while using the app.

## Where is data saved?
Your records persist in `server/data/studiohub.json` (created automatically on first launch). A separate session secret is created in `server/data/.session-secret`. Back up the **entire `server/data` folder** periodically. Never delete it if you want to keep your records. Do not publish it on GitHub.

## Project layout
```
scs-studiohub/
  client/
    index.html              # HTML entry point (required by Vite)
    src/App.jsx             # React pages/modules
    src/styles.css          # Purple-and-white styling
    src/api.js              # Calls to Express API
  server/
    src/index.js            # Backend routes and JSON persistence
    data/                   # Created automatically on first run
  package.json              # One-command setup/start scripts
```

## Included modules
Dashboard, My Planner (calendar/schedule/to-dos), Inventory, Price List, Orders, Price Calculator with downloadable/printable receipt images, Subscriptions & Warranty (automatically calculated expiry), and Settings with light/dark mode.

## Notes
- This is a local single-owner starter app, not a production multi-user database.
- React still uses a small `client/index.html` to mount the app. The actual pages and functionality are organized into separate React and CSS files.
- Default products and tasks are sample data, not real business records.
- The generated branded receipt is a business transaction record; it is not automatically a statutory tax invoice.

## November 2026 update
- Original SCS artwork is now the sidebar and sign-in logo.
- Planner calendar uses `#D552A3`, with pastel event/task indicators. Scheduled tasks automatically appear on calendar dates.
- To-dos can be edited with notes and image attachments (up to 1.8 MB each). Attachments are stored inside the local JSON data file; back up `server/data`.
- Inventory items can be edited. Historical order unit prices stay as originally recorded.
- Orders can be edited for status, payment status, customer details, and warranty. Premium Account orders automatically create/update linked subscription & warranty records, using a duration in days, months, or years.
- Price Calculator supports selecting an existing order, choosing payment method, and rendering/downloading/printing the receipt as a PNG image using the simplified white-and-purple SCS receipt design. A receipt is assigned its unique six-digit OR number on first generation, persisted in the local database. Regenerating the same order's receipt keeps the number. Manual receipts receive their own numbers.

**Receipt note:** Receipts are drawn directly by the app using a clean branded layout. The form and API currently allow up to four item rows. Ensure local receipt practices meet applicable Philippine tax/receipt rules before using this as a statutory official receipt. The default demo setup is not production-ready.

## November 2026 revisions
- Calendar: only dates containing a scheduled occasion, event, or task receive a purple highlight; other dates have neutral backgrounds.
- Inventory: separate **Materials Inventory** with supplier cost, quantity, purchase-pack size, material type, and low-stock threshold. Materials are available for the price calculator but not automatically added to the selling catalog.
- Price List: add/edit independent selling products with name, category (Flowers, Keychains, Premium Accounts), selling price, and optional image. Previous catalog products are preserved.
- Orders: the receipt icon immediately downloads a PNG official receipt with the order's assigned OR number. If a receipt already exists, its payment method and discount are retained; otherwise payment method is marked **Not specified** rather than assuming Cash.
- Premium accounts: purchase date automatically acts as the warranty start. Editing the purchase date updates the associated warranty calculation.
- Receipt calculator: removed the permanently visible image preview; use Generate Receipt PNG and then Download PNG or Print.
- Dashboard: clickable summary figures; Total Sales expands a category/product sales report, and other cards navigate to their pages.
- Existing records in server/data are retained. A one-time migration separates legacy material entries from the selling catalog.

For a clean installation, run `npm run setup` and then `npm run dev` from the `scs-studiohub` folder. Do not run the client alone; the server is required for login, storage, orders, and receipts.

## November 19 update — stock and illustrated pricelist
- **Orders:** The product picker shows the product name and selling price without any artificial `stock 99999` label.
- **Inventory:** Switch between Craft Materials and Premium Accounts. Premium Accounts lists the actual available slots for each premium product added to Price List. Select **Edit Stock** to set remaining units, supplier cost per slot, and the low-stock alert threshold.
- **Inventory controls:** New premium products start at **zero stock** until you enter available units. New premium orders are rejected if there is insufficient stock, and reduce the stock when saved. Editing an order quantity adjusts the stock by the difference, and deleting an order restores its premium units. Existing normal stock counts are preserved. Previous artificial placeholders (99,999 or more) are reset to zero for premium products.
- **Price List Print / Export:** PDF and PNG now display product **photo, name, and selling price** together inside a bordered card. A missing photo shows a placeholder.
- **Data:** Existing orders, receipts, and subscription records stay in `server/data/studiohub.json`; back up this file before replacing an existing installation.

## Inventory supplier-cost entry update
- Add/Edit Material offers **Supplier cost for entire pack** or **Cost per piece**. Select whichever matches your supplier invoice.
- Enter the number of units per purchased pack. Per-piece entries are converted to total supplier pack cost internally for compatibility with the Price Calculator and existing inventory records.
- The Craft Materials table now labels **Supplier cost** and shows the calculated **Cost per piece** next to it.
- Example: 100 fuzzy wires costing ₱45 can be entered as ₱45 per pack or ₱0.45 per piece. Both calculate ₱0.45 per wire.

## November 21, 2026 UI revisions
- **Log Out** remains visible at the bottom of the sidebar and in the top-right header; either asks for confirmation, clears the token, and returns to sign-in.
- **Header** uses a transparent background and Inter typography instead of the former white header box and decorative serif headings.
- **Planner** supports one-time, weekly, monthly, and yearly events. Recurrence is stored as `repeat` in the existing events array. The original event date is not changed; calendar occurrences are calculated from it. For monthly 29th–31st and yearly February 29 recurrence, months with fewer days use their final day.
- **Price List** subcategories have independent Show/Hide controls. These only affect the on-screen view, not saved products or PDF/PNG exports.
- **Dashboard warranty status** buttons open the Subscriptions & Warranty screen filtered to Active, Expiring Soon, or Expired customers. The warranty page also has filter pills. Expired status labels are red.
- Existing orders, receipts, materials, and warranties were retained.

## Craft Materials cost-per-piece calculation (November 21 update)
- Under Inventory → Craft Materials → Add Material, select **Supplier cost per pack**, enter the supplier cost and **Units per purchased pack**. The form immediately previews the cost per piece using `supplier cost ÷ pieces per pack`.
- Example: a pack costs ₱200 and contains 100 pieces: ₱200 / 100 = ₱2 per piece.
- Materials Inventory displays the supplier cost and calculated cost per piece in separate columns; records retain the complete pack cost and pack size, with an automatically derived `costPerPiece` field for new or edited materials.
- Price Calculator → Flowers now shows the per-piece cost in the selection list and selected row. Using 25 pieces of the above example costs 25 × ₱2 = ₱50.
- The alternative **Cost per piece** input still works: the frontend converts this to pack total on save so all calculations stay consistent. Existing saved materials continue to be supported.
#   S C S - S t u d i o - H u b  
 