        // 1. PRODUCT CATALOG DATA MATRIX
        const PRODUCT_CATALOG = {
            "Puff puff":   { category: "Snack", price: 100, profitPerUnit: 32 },
            "Egg roll":    { category: "Snack", price: 500, profitPerUnit: 110 },
            "Donut":       { category: "Snack", price: 200, profitPerUnit: 71 },
            "Buns":        { category: "Snack", price: 100, profitPerUnit: 37.25 },
            "Tropical":    { category: "Drink", price: 300, profitPerUnit: 116 },
            "Smoove":      { category: "Drink", price: 300, profitPerUnit: 116 },
            "Lacasera":    { category: "Drink", price: 300, profitPerUnit: 112.5 },
            "Zobo":        { category: "Drink", price: 300, profitPerUnit: 68 },
            "Water":       { category: "Drink", price: 200, profitPerUnit: 62.5 },
            "Coke":        { category: "Drink", price: 500, profitPerUnit: 137 },
            "Fanta":       { category: "Drink", price: 500, profitPerUnit: 133 },
            "American Cola": { category: "Drink", price: 400, profitPerUnit: 100 },
        };

        let activeSales = [];
        let editingId = null; // THE FIX: Keeps track of which specific row item is currently being edited

        let database = JSON.parse(localStorage.getItem("chops_app_db_v2")) || {};

        window.onload = function() {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById("working-date").value = today;
            
            populateProductDropdown();
            loadDayData(today);
            renderHistory();
            renderWeeklyReports();

            document.getElementById("working-date").addEventListener("change", function(e) {
                loadDayData(e.target.value);
            });
        };

        function populateProductDropdown() {
            const dropdown = document.getElementById("form-product");
            dropdown.innerHTML = "";
            Object.keys(PRODUCT_CATALOG).forEach(prod => {
                let opt = document.createElement("option");
                opt.value = prod;
                opt.innerText = `${prod} (₦${PRODUCT_CATALOG[prod].price})`;
                dropdown.appendChild(opt);
            });
        }

        function switchView(viewName) {
            const views = ['input', 'history', 'weekly'];
            views.forEach(v => {
                document.getElementById(`view-${v}`).classList.add("hidden");
                document.getElementById(`nav-${v}`).classList.remove("active");
            });
            document.getElementById(`view-${viewName}`).classList.remove("hidden");
            document.getElementById(`nav-${viewName}`).classList.add("active");

            if (viewName === 'history') renderHistory();
            if (viewName === 'weekly') renderWeeklyReports();
        }

                // 24-INGREDIENT MASTER CATALOG
        const INGREDIENTS_LIST = [
            "Oil", "Egg", "Yeast", "Baking powder", "Smoove", "Tropical",  
            "Water", "Lacasera", "Coke", "Fanta", "American cola", "Flour", 
            "Butter", "sugar", "Milk", "Nylon", "Battery", "Bottle", "Pepper",
            "Zobo leaves", "Zobo Flavour", "Cloves", "Straws", "Nutmeg", "Flavour",
            "Sketch Pad", "Bowls", "Foil plate", "Extension Wire", "", ""
        ];

        let expensesDatabase = JSON.parse(localStorage.getItem("chops_expenses_db")) || {};
        let activeEditingWeek = null;

        // Dynamically build the 24 input rows inside the HTML display card panel
        function generateIngredientsFormUI() {
            const container = document.getElementById("ingredients-form-container");
            container.innerHTML = "";
            
            INGREDIENTS_LIST.forEach(ing => {
                const row = document.createElement("div");
                row.style.display = "flex";
                row.style.justifyContent = "space-between";
                row.style.alignItems = "center";
                row.style.marginBottom = "8px";
                row.style.paddingBottom = "6px";
                row.style.borderBottom = "1px dashed #f3f4f6";
                
                // If it is Oil, label it clearly so she remembers the 50/50 profit cut rule
                const extraLabel = (ing === "Oil") ? " <small style='color:#db2777; font-weight:bold;'>(50% Split)</small>" : "";
                
                row.innerHTML = `
                    <span style="font-weight:600; font-size:0.9rem; color:#4b5563;">${ing}${extraLabel}</span>
                    <input type="number" id="ing-val-${ing.replace(/\s+/g, '_')}" value="0" min="0" oninput="runGlobalExpensesEngine()" style="width:130px; padding:6px; text-align:right;">
                `;
                container.appendChild(row);
            });
        }

        // Toggles sidebar clicks and automatically refreshes baseline calculations
        function switchView(viewName) {
            const views = ['input', 'history', 'weekly', 'expenses'];
            views.forEach(v => {
                document.getElementById(`view-${v}`).classList.add("hidden");
                document.getElementById(`nav-${v}`).classList.remove("active");
            });
            document.getElementById(`view-${viewName}`).classList.remove("hidden");
            document.getElementById(`nav-${viewName}`).classList.add("active");

            if (viewName === 'history') renderHistory();
            if (viewName === 'weekly') renderWeeklyReports();
            if (viewName === 'expenses') {
                generateIngredientsFormUI();
                runGlobalExpensesEngine();
                renderWeeklyExpensesArchive();
            }
        }

                // MATH ENGINE: Calculates Running Lifetime Totals and applies Ingredient Deductions
                    function runGlobalExpensesEngine() {
            let grandBaseCost = 0;
            let grandBaseProfitWithoutTithe = 0;
            let weeklyGroupsForTithe = {};

            // Step 1: Scan all daily records to get absolute baseline costs and profits
            Object.keys(database).forEach(date => {
                grandBaseCost += database[date].metrics.finalBusinessCost;
                grandBaseProfitWithoutTithe += database[date].metrics.finalPureProfit;

                const weekLabel = getWeekIdentifier(date);
                if (!weeklyGroupsForTithe[weekLabel]) weeklyGroupsForTithe[weekLabel] = 0;
                weeklyGroupsForTithe[weekLabel] += database[date].metrics.finalPureProfit;
            });

            // Step 2: Sum up total tithe due across all recorded weeks
            let totalHistoricalTithe = 0;
            Object.keys(weeklyGroupsForTithe).forEach(week => {
                totalHistoricalTithe += (weeklyGroupsForTithe[week] * 0.10);
            });

            let grandBaseProfitWithTitheDeducted = grandBaseProfitWithoutTithe - totalHistoricalTithe;

            // THE FIX: Look at ALL past weeks already saved in the expenses database and deduct them from the baseline
            Object.keys(expensesDatabase).forEach(weekKeyId => {
                // Skip the week we are currently actively typing/editing so we don't double-count it
                if (weekKeyId === activeEditingWeek) return;

                const pastWeekData = expensesDatabase[weekKeyId];
                let pastStandardSum = 0;
                let pastOilSum = 0;

                // Sum up what was spent in this archived week record
                Object.keys(pastWeekData.ingredients).forEach(ing => {
                    const val = pastWeekData.ingredients[ing] || 0;
                    if (ing === "Oil") pastOilSum += val;
                    else pastStandardSum += val;
                });

                const pastOilHalf = pastOilSum / 2;

                // Permanently subtract those archived expenses from our global starting point
                grandBaseCost -= (pastStandardSum + pastOilHalf);
                grandBaseProfitWithTitheDeducted -= pastOilHalf;
            });

            // Display the corrected baseline figures onto the top banners
            document.getElementById("grand-base-cost").innerText = `₦${grandBaseCost.toLocaleString()}`;
            document.getElementById("grand-base-profit").innerText = `₦${grandBaseProfitWithTitheDeducted.toLocaleString()}`;

            // Step 3: Sum up raw materials fields currently typed on the screen right now
            let standardIngredientsSum = 0;
            let oilSum = 0;

            INGREDIENTS_LIST.forEach(ing => {
                const inputEl = document.getElementById(`ing-val-${ing.replace(/\s+/g, '_')}`);
                const value = inputEl ? parseFloat(inputEl.value) || 0 : 0;
                
                if (ing === "Oil") {
                    oilSum += value;
                } else {
                    standardIngredientsSum += value;
                }
            });

            // Step 4: Run the current active week subtraction equations
            const oilHalfSplit = oilSum / 2;
            
            const adjustedGrandCost = grandBaseCost - (standardIngredientsSum + oilHalfSplit);
            const adjustedGrandProfit = grandBaseProfitWithTitheDeducted - oilHalfSplit;

            // Refresh the numbers inside the right sticky card widgets
            document.getElementById("exp-total-ingredients").innerText = `₦${standardIngredientsSum.toLocaleString()}`;
            document.getElementById("exp-oil-split").innerText = `-₦${oilHalfSplit.toLocaleString()}`;
            document.getElementById("exp-adjusted-cost").innerText = `₦${adjustedGrandCost.toLocaleString()}`;
            document.getElementById("exp-adjusted-profit").innerText = `₦${adjustedGrandProfit.toLocaleString()}`;

            const startVal = document.getElementById("expense-start-date").value;
            const endVal = document.getElementById("expense-end-date").value;
            const labelEl = document.getElementById("expense-active-week-label");
            
            if (startVal && endVal) {
                labelEl.innerText = `Week: ${startVal} to ${endVal}`;
            } else {
                labelEl.innerText = "No week range specified yet";
            }

            return { standardIngredientsSum, oilSum, oilHalfSplit, adjustedGrandCost, adjustedGrandProfit };
        }



        // SAVE LOG ENGINE: Saves weekly ingredient cards firmly into local memory
        function saveWeeklyExpenses() {
            const startStr = document.getElementById("expense-start-date").value;
            const endStr = document.getElementById("expense-end-date").value;

            if (!startStr || !endStr) return alert("⚠️ Please specify both a Start and End date range first.");
            
            const weekKeyId = activeEditingWeek || `${startStr}_to_${endStr}`;
            let loggedItemsData = {};

            INGREDIENTS_LIST.forEach(ing => {
                const val = parseFloat(document.getElementById(`ing-val-${ing.replace(/\s+/g, '_')}`).value) || 0;
                loggedItemsData[ing] = val;
            });

            const currentCalculations = runGlobalExpensesEngine();

            expensesDatabase[weekKeyId] = {
                startDate: startStr,
                endDate: endStr,
                ingredients: loggedItemsData,
                calculationsSummary: currentCalculations
            };

            localStorage.setItem("chops_expenses_db", JSON.stringify(expensesDatabase));
            alert(`💾 Expense card logged successfully for week group [${startStr} - ${endStr}]!`);

            // WIPE AND RESET STACK
            activeEditingWeek = null;
            document.getElementById("expense-start-date").value = "";
            document.getElementById("expense-end-date").value = "";
            document.getElementById("btn-save-expenses").innerText = "💾 Save Week Expenses";
            document.getElementById("btn-save-expenses").style.background = "#db2777";

            generateIngredientsFormUI();
            runGlobalExpensesEngine();
            renderWeeklyExpensesArchive();
        }

        // ARCHIVE PANEL ENGINE: Draws out saved weeks with click-to-edit capabilities
        function renderWeeklyExpensesArchive() {
            const container = document.getElementById("weekly-expenses-archive-container");
            container.innerHTML = "";
            const savedWeeks = Object.keys(expensesDatabase).sort().reverse();

            if (savedWeeks.length === 0) {
                container.innerHTML = `<div style="padding:25px; text-align:center; color:#9ca3af; background:white; border-radius:12px; font-style:italic; border:1px dashed #ccc;">No weekly materials expense forms filed inside memory records yet.</div>`;
                return;
            }

            savedWeeks.forEach(weekId => {
                const data = expensesDatabase[weekId];
                const card = document.createElement("div");
                card.className = "archive-card";
                
                // Collect list of items that actually have price entries higher than 0
                let boughtItemsArray = [];
                Object.keys(data.ingredients).forEach(item => {
                    if (data.ingredients[item] > 0) {
                        boughtItemsArray.push(`• ${item}: ₦${data.ingredients[item].toLocaleString()}`);
                    }
                });

                card.innerHTML = `
                    <button onclick="toggleAccordion('exp-arch-${weekId}')" class="archive-header" style="background:#fff5f7;">
                        <span style="color:#b91c1c;">🗓️ Frame: ${data.startDate} to ${data.endDate}</span>
                        <span style="background:#fce7f3; color:#9d174d; font-size:0.8rem; padding:4px 10px; border-radius:12px;">Oil Bought: ₦${(data.ingredients["Oil"] || 0).toLocaleString()}</span>
                        <span id="icon-exp-arch-${weekId}">▼</span>
                    </button>
                    <div id="content-exp-arch-${weekId}" class="hidden archive-body" style="background:#ffffff;">
                        <div style="font-weight:700; font-size:0.75rem; color:#6b7280; text-transform:uppercase; margin-bottom:6px;">Materials Filed Inventory:</div>
                        <div class="itemised-box" style="margin-bottom:12px;">
                            ${boughtItemsArray.length > 0 ? boughtItemsArray.map(line => `<div style="padding:3px 0; border-bottom:1px solid #f3f4f6;">${line}</div>`).join('') : '<span style="color:#aaa; font-style:italic;">No material expenses logged for this week block.</span>'}
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <button onclick="triggerEditWeeklyExpense('${weekId}')" style="background:#f3f4f6; border:1px solid #d1d5db; color:#1e1b4b; padding:5px 12px; font-weight:700; border-radius:4px; font-size:0.75rem; cursor:pointer;">🔧 Edit & Resave Form</button>
                            <button onclick="deleteWeeklyExpense('${weekId}')" style="background:none; border:none; color:#dc2626; text-decoration:underline; font-size:0.75rem; cursor:pointer;">⚠️ Delete Log</button>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        }

        // EDITING HOOK FEATURE: Pulls archived forms right back up to active states
        function triggerEditWeeklyExpense(weekId) {
            const data = expensesDatabase[weekId];
            if (!data) return;

            activeEditingWeek = weekId;
            document.getElementById("expense-start-date").value = data.startDate;
            document.getElementById("expense-end-date").value = data.endDate;

            // Load values back into fields
            Object.keys(data.ingredients).forEach(ing => {
                const inputField = document.getElementById(`ing-val-${ing.replace(/\s+/g, '_')}`);
                if (inputField) inputField.value = data.ingredients[ing];
            });

            // Turn save button into Update Mode styling indicators
            const btn = document.getElementById("btn-save-expenses");
            btn.innerText = "🔧 Update & Resave Week Log";
            btn.style.background = "#ea580c";

            document.getElementById("view-expenses").scrollIntoView({ behavior: "smooth" });
            runGlobalExpensesEngine();
        }

        function deleteWeeklyExpense(weekId) {
            if (confirm("Are you completely sure you want to erase this weekly material expense form?")) {
                delete expensesDatabase[weekId];
                localStorage.setItem("chops_expenses_db", JSON.stringify(expensesDatabase));
                runGlobalExpensesEngine();
                renderWeeklyExpensesArchive();
            }
        }

                // EXPORT FUNCTION: Packs all daily and weekly logs into a secure download file
        function exportBusinessDataBackup() {
            // Bundle up both her sales data logs and ingredient expenses sheets
            const backupBundle = {
                salesLogs: localStorage.getItem("chops_app_db_v2"),
                expenseLogs: localStorage.getItem("chops_expenses_db")
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupBundle));
            const downloadAnchor = document.createElement('a');
            
            // Generate a filename with the current date so she stays organized
            const todayStamp = new Date().toISOString().split('T')[0];
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `Chops_Counter_Backup_${todayStamp}.json`);
            
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        }

        // IMPORT CONTROLLER: Opens her phone's file selector wheel
        function importBusinessDataBackup() {
            document.getElementById("backup-file-handler").click();
        }

        // RESTORE FUNCTION: Unpacks her file and merges records back into her app memory
        function processRestoreFile(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const parsedBundle = JSON.parse(e.target.result);
                    
                    if (parsedBundle.salesLogs || parsedBundle.expenseLogs) {
                        if (confirm("⚠️ This will overwrite any test data on this phone right now with her backup file. Do you want to proceed?")) {
                            
                            // Restore memory slots
                            if(parsedBundle.salesLogs) localStorage.setItem("chops_app_db_v2", parsedBundle.salesLogs);
                            if(parsedBundle.expenseLogs) localStorage.setItem("chops_expenses_db", parsedBundle.expenseLogs);
                            
                            // Core refresh to repaint the screen grids instantly
                            database = JSON.parse(localStorage.getItem("chops_app_db_v2")) || {};
                            expensesDatabase = JSON.parse(localStorage.getItem("chops_expenses_db")) || {};
                            
                            alert("🎉 Business database restored successfully! All book records are back.");
                            window.location.reload(); // Hard reset layout views
                        }
                    } else {
                        alert("❌ Invalid file type. Please upload a valid Chops Counter backup file.");
                    }
                } catch (err) {
                    alert("❌ Failed to parse data file. The backup file might be corrupted.");
                }
            };
            reader.readAsText(file);
        }




                function addSaleRow(e) {
            e.preventDefault();
            const name = document.getElementById("form-product").value;
            const qty = parseInt(document.getElementById("form-qty").value);
            const method = document.getElementById("form-payment").value;
            const catalogItem = PRODUCT_CATALOG[name];
            const totalAmount = catalogItem.price * qty;

            if (editingId !== null) {
                // THE FIX: Find the item at its exact original position and update it
                const index = activeSales.findIndex(item => item.id === editingId);
                if (index !== -1) {
                    activeSales[index].product = name;
                    activeSales[index].category = catalogItem.category;
                    activeSales[index].qty = qty;
                    activeSales[index].payment = method;
                    activeSales[index].amount = totalAmount;
                }
                editingId = null; // Reset the tracker
                document.querySelector(".btn-submit").innerText = "Add Row"; // Reset button text
                document.querySelector(".btn-submit").style.background = "#4f46e5";
            } else {
                // Otherwise, add it as a normal new row at the bottom
                activeSales.push({
                    id: Date.now(), product: name, category: catalogItem.category,
                    qty: qty, payment: method, amount: totalAmount
                });
            }

            document.getElementById("form-qty").value = 1;
            updateTableUI();
            calculateEverything();
        }


        function deleteSaleRow(id) {
            activeSales = activeSales.filter(item => item.id !== id);
            updateTableUI();
            calculateEverything();
        }

                function editSaleRow(id) {
            const itemToEdit = activeSales.find(item => item.id === id);
            if (!itemToEdit) return;

            // Load values back into the form fields
            document.getElementById("form-product").value = itemToEdit.product;
            document.getElementById("form-qty").value = itemToEdit.qty;
            document.getElementById("form-payment").value = itemToEdit.payment;

            // Set our tracker to remember this item's ID
            editingId = id;

            // Change button color and text to give a visual clue
            const submitBtn = document.querySelector(".btn-submit");
            submitBtn.innerText = "🔧 Update Row";
            submitBtn.style.background = "#ea580c"; // Turns orange to show editing mode

            document.getElementById("sale-form").scrollIntoView({ behavior: 'smooth' });
        }



        function updateTableUI() {
            const tbody = document.getElementById("sales-table-body");
            tbody.innerHTML = "";
            
            if (activeSales.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#9ca3af; font-style:italic;">No entries logged for this date yet.</td></tr>`;
                return;
            }
            
            activeSales.forEach(item => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td style="font-weight:600;">${item.product}</td>
                    <td><span class="badge ${item.category === 'Snack' ? 'badge-snack' : 'badge-drink'}">${item.category}</span></td>
                    <td style="text-align:center; font-weight:bold;">${item.qty}</td>
                    <td style="text-align:right; color:#16a34a; font-weight:600;">${item.payment === 'Cash' ? '₦' + item.amount.toLocaleString() : '-'}</td>
                    <td style="text-align:right; color:#2563eb; font-weight:600;">${item.payment === 'Transfer' ? '₦' + item.amount.toLocaleString() : '-'}</td>
                    <td style="text-align:center; display:flex; gap:6px; justify-content:center;">
                        <button type="button" onclick="editSaleRow(${item.id})" style="background:#e0e7ff; color:#4338ca; border:1px solid #c7d2fe; padding:4px 8px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:600;">Edit</button>
                        <button type="button" onclick="deleteSaleRow(${item.id})" class="btn-delete">Remove</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }

                function calculateEverything() {
            let totalSnacks = 0; 
            let totalDrinks = 0; 
            let totalProfitMargins = 0;

            activeSales.forEach(item => {
                if (item.category === "Snack") totalSnacks += item.amount;
                else if (item.category === "Drink") totalDrinks += item.amount;
                totalProfitMargins += (item.qty * PRODUCT_CATALOG[item.product].profitPerUnit);
            });

            const transportFare = parseFloat(document.getElementById("input-transport").value) || 0;
            const grossRevenue = totalSnacks + totalDrinks;
            const netRevenue = grossRevenue - transportFare;
            
            // THE FIX: Transport fare is now completely ignored by profit and subtracted from cost instead
            const finalPureProfit = totalProfitMargins;
            const finalBusinessCost = (netRevenue - finalPureProfit);

            document.getElementById("calc-snacks").innerText = `₦${totalSnacks.toLocaleString()}`;
            document.getElementById("calc-drinks").innerText = `₦${totalDrinks.toLocaleString()}`;
            document.getElementById("calc-gross").innerText = `₦${grossRevenue.toLocaleString()}`;
            document.getElementById("calc-trans").innerText = `-₦${transportFare.toLocaleString()}`;
            document.getElementById("calc-net").innerText = `₦${netRevenue.toLocaleString()}`;
            document.getElementById("calc-profit").innerText = `₦${finalPureProfit.toLocaleString()}`;
            document.getElementById("calc-cost").innerText = `₦${finalBusinessCost.toLocaleString()}`;

            return { transportFare, grossRevenue, netRevenue, finalPureProfit, finalBusinessCost };
        }


        function saveDayToStorage() {
            const targetDate = document.getElementById("working-date").value;
            if (!targetDate) return alert("Please pick a valid log sheet date.");
            
            const calcs = calculateEverything();
            
            database[targetDate] = { sales: activeSales, transport: calcs.transportFare, metrics: calcs };
            localStorage.setItem("chops_app_db_v2", JSON.stringify(database));
            
            alert(`✅ Saved safely for ${targetDate}!`);
            
            // Clear current workspace arrays smoothly
            activeSales = [];
            document.getElementById("input-transport").value = 0;
            
            updateTableUI();
            calculateEverything();
            renderHistory();
            renderWeeklyReports();
        }

        function loadDayData(dateString) {
            if (database[dateString]) {
                activeSales = database[dateString].sales || [];
                document.getElementById("input-transport").value = database[dateString].transport || 0;
            } else {
                activeSales = []; 
                document.getElementById("input-transport").value = 0;
            }
            updateTableUI(); 
            calculateEverything();
        }

        function renderHistory() {
            const container = document.getElementById("history-container");
            container.innerHTML = "";
            const dates = Object.keys(database).sort().reverse();
            if (dates.length === 0) {
                container.innerHTML = `<div style="padding:40px; text-align:center; color:#9ca3af; background:white; border-radius:12px; font-style:italic; border:1px dashed #ccc;">No history logs stored yet.</div>`;
                return;
            }
            dates.forEach(date => {
                const data = database[date];
                const card = document.createElement("div");
                card.className = "archive-card";
                card.innerHTML = `
                    <button onclick="toggleAccordion('hist-${date}')" class="archive-header">
                        <span style="color:#4f46e5;">📅 ${date}</span>
                        <span style="background:#dcfce7; color:#15803d; font-size:0.8rem; padding:4px 10px; border-radius:12px;">Profit: ₦${data.metrics.finalPureProfit.toLocaleString()}</span>
                        <span id="icon-hist-${date}">▼</span>
                    </button>
                    <div id="content-hist-${date}" class="hidden archive-body">
                        <div class="history-grid">
                            <div class="hist-pill"><p>Gross Rev</p><span>₦${data.metrics.grossRevenue.toLocaleString()}</span></div>
                            <div class="hist-pill"><p>Transport</p><span style="color:#dc2626;">₦${data.transport.toLocaleString()}</span></div>
                            <div class="hist-pill" style="background:#f0fdf4;"><p style="color:#16a34a;">Pure Profit</p><span style="color:#16a34a;">₦${data.metrics.finalPureProfit.toLocaleString()}</span></div>
                            <div class="hist-pill"><p>Restock Cost</p><span style="color:#4b5563;">₦${data.metrics.finalBusinessCost.toLocaleString()}</span></div>
                        </div>
                        <div style="display:flex; justify-content:flex-end;">
                            <button onclick="deleteDayRecord('${date}')" style="background:none; border:none; color:#dc2626; cursor:pointer; text-decoration:underline; font-size:0.8rem;">⚠️ Delete Entry</button>
                        </div>
                    </div>`;
                container.appendChild(card);
            });
        }

        function getWeekIdentifier(dateString) {
            const date = new Date(dateString); 
            const day = date.getDay();
                        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const start = new Date(date.setDate(diff)); 
            const end = new Date(start);
            end.setDate(end.getDate() + 4);
            return `${start.toLocaleDateString('en-US', {month:'short', day:'numeric'})} - ${end.toLocaleDateString('en-US', {month:'short', day:'numeric'})}`;
        }

                function renderWeeklyReports() {
            const container = document.getElementById("weekly-container");
            container.innerHTML = ""; 
            let weeklyGroups = {};
            
            Object.keys(database).forEach(date => {
                const label = getWeekIdentifier(date);
                if (!weeklyGroups[label]) weeklyGroups[label] = { profit: 0, cost: 0 };
                weeklyGroups[label].profit += database[date].metrics.finalPureProfit;
                weeklyGroups[label].cost += database[date].metrics.finalBusinessCost;
            });
            
            const weeks = Object.keys(weeklyGroups).sort().reverse();
            if (weeks.length === 0) {
                container.innerHTML = `<div style="padding:40px; text-align:center; color:#9ca3af; background:white; border-radius:12px; font-style:italic; border:1px dashed #ccc;">No weekly compiled data yet.</div>`;
                return;
            }
            weeks.forEach((w, idx) => {
                const tithe = weeklyGroups[w].profit * 0.10;
                const balance = weeklyGroups[w].profit - tithe;
                const card = document.createElement("div"); 
                card.className = "archive-card";
                card.innerHTML = `
                    <button onclick="toggleAccordion('week-${idx}')" class="archive-header" style="background:#f5f3ff;">
                        <span style="color:#4c1d95; font-weight:800;">📅 Week: ${w}</span>
                        <span style="background:#e0e7ff; color:#4338ca; font-size:0.8rem; padding:4px 10px; border-radius:12px;">Total Profit: ₦${weeklyGroups[w].profit.toLocaleString()}</span>
                        <span id="icon-week-${idx}">▼</span>
                    </button>
                    <div id="content-week-${idx}" class="hidden archive-body">
                        <div class="history-grid" style="grid-template-columns: repeat(3, 1fr);">
                            <div class="hist-pill"><p>Gross Profit</p><span>₦${weeklyGroups[w].profit.toLocaleString()}</span></div>
                            <div class="hist-pill" style="background:#fef2f2;"><p style="color:#b91c1c; font-weight:700;">⛪ 10% Tithe Due</p><span style="color:#b91c1c;">₦${tithe.toLocaleString()}</span></div>
                            <div class="hist-pill" style="background:#f0fdf4;"><p style="color:#16a34a; font-weight:700;">⭐ True Balance</p><span style="color:#16a34a;">₦${balance.toLocaleString()}</span></div>
                        </div>
                        <div class="hist-pill" style="margin-top:10px; text-align:center;"><p>Total Restock Capital for Week (Transport Deducted)</p><span style="font-size:1.1rem;">₦${weeklyGroups[w].cost.toLocaleString()}</span></div>
                    </div>`;
                container.appendChild(card);
            });
        }


        function toggleAccordion(id) {
            const content = document.getElementById(`content-${id}`);
            const icon = document.getElementById(`icon-${id}`);
            if (content.classList.contains("hidden")) { content.classList.remove("hidden"); icon.style.transform = "rotate(180deg)"; }
            else { content.classList.add("hidden"); icon.style.transform = "rotate(0deg)"; }
        }

        function deleteDayRecord(date) {
            if(confirm(`Permanently delete records for ${date}?`)) {
                delete database[date]; 
                localStorage.setItem("chops_app_db_v2", JSON.stringify(database));
                renderHistory(); 
                renderWeeklyReports();
            }
        }
    