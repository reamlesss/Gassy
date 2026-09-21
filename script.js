const dateField = document.querySelector('#date');
const fuelForm = document.querySelector('#fuel-form');
const entryList = document.querySelector('#entry-list');
const formStatus = document.querySelector('#form-status') || document.createElement('p');

if (!formStatus.id) {
    formStatus.id = 'form-status';
    formStatus.className = 'form-status';
    fuelForm?.append(formStatus);
}

const supabaseReady = window.supabase && window.GASSY_SUPABASE_URL && !window.GASSY_SUPABASE_URL.includes('YOUR_PROJECT');
const supabaseClient = supabaseReady ? window.supabase.createClient(window.GASSY_SUPABASE_URL, window.GASSY_SUPABASE_ANON_KEY) : null;
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

if (dateField && !dateField.value) {
    const today = new Date();
    dateField.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

const formatMoney = (value) => new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 }).format(value);
const formatDate = (value) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`));

function renderEntries(entries) {
    if (!entryList) return;

    if (!entries.length) {
        entryList.innerHTML = '<p class="entry-empty">No fuel entries this month yet.</p>';
        return;
    }

    entryList.innerHTML = entries.slice(0, 5).map((entry) => {
        const stationName = entry.station === 'shell' ? 'Shell' : 'ORLEN';
        const stationIcon = entry.station === 'shell'
            ? '<div class="entry-brand shell-logo">S</div>'
            : '<div class="entry-brand orlen-logo">O</div>';
        const litersValue = entry.liters != null && Number(entry.liters) > 0 ? `${Number(entry.liters).toFixed(2)} L` : null;
        const label = litersValue ? `${litersValue} <span>·</span> ${stationName}` : stationName;
        const price = entry.price_per_liter ?? (entry.liters ? entry.amount / entry.liters : null);
        const priceText = price != null ? `${Number(price).toFixed(2)} Kč/L` : 'Price pending';

        return `
            <article class="entry-item">
                ${stationIcon}
                <div class="entry-details">
                    <strong>${label}</strong>
                    <small>${formatDate(entry.entry_date)}</small>
                </div>
                <div class="entry-amount">
                    <strong>${formatMoney(entry.amount)} Kč</strong>
                    <small>${priceText}</small>
                </div>
            </article>
        `;
    }).join('');
}

function renderTotals(entries) {
    const totals = { shell: 0, orlen: 0 };
    entries.forEach((entry) => {
        totals[entry.station] = (totals[entry.station] || 0) + Number(entry.amount || 0);
    });

    Object.entries(totals).forEach(([station, used]) => {
        const card = document.querySelector(`[data-card="${station}"]`);
        if (!card) return;
        const percent = Math.min((used / 5000) * 100, 100);
        card.querySelector('.card-used').textContent = formatMoney(used);
        card.querySelector('.card-remaining').textContent = `${formatMoney(Math.max(5000 - used, 0))} Kč remaining`;
        card.querySelector('.card-percent').textContent = `${percent.toFixed(1)}%`;
        const progressFill = card.querySelector('.progress-fill');
        if (progressFill) progressFill.style.width = `${percent}%`;
    });

    const combined = totals.shell + totals.orlen;
    const combinedUsed = document.querySelector('#combined-used');
    const combinedCaption = document.querySelector('#combined-caption');

    if (combinedUsed) combinedUsed.textContent = `${formatMoney(combined)} Kč`;
    if (combinedCaption) combinedCaption.textContent = `${((combined / 10000) * 100).toFixed(1)}% of 10,000 Kč monthly limit`;
}

async function loadEntries() {
    if (!supabaseClient) {
        renderEntries([]);
        return;
    }

    const { data, error } = await supabaseClient
        .from('fuel_entries')
        .select('*')
        .gte('entry_date', monthStart)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) {
        formStatus.textContent = `Could not load entries: ${error.message}`;
        formStatus.className = 'form-status error';
        return;
    }

    renderEntries(data || []);
    renderTotals(data || []);
}

async function saveEntry(event) {
    event?.preventDefault();

    if (!supabaseClient) {
        formStatus.textContent = 'Add your Supabase values to supabase-config.js first.';
        formStatus.className = 'form-status error';
        return;
    }

    const amountInput = document.querySelector('#amount');
    if (!amountInput || !amountInput.value) {
        formStatus.textContent = 'Please add the total amount.';
        formStatus.className = 'form-status error';
        amountInput?.focus();
        return;
    }

    const values = {
        station: document.querySelector('#station').value,
        entry_date: dateField.value,
        liters: document.querySelector('#liters').value ? Number(document.querySelector('#liters').value) : null,
        amount: Number(amountInput.value),
        price_per_liter: document.querySelector('#price').value ? Number(document.querySelector('#price').value) : null
    };

    const { error } = await supabaseClient.from('fuel_entries').insert(values);
    if (error) {
        formStatus.textContent = `Could not save entry: ${error.message}`;
        formStatus.className = 'form-status error';
        return;
    }

    fuelForm.reset();
    dateField.value = new Date().toISOString().slice(0, 10);
    formStatus.textContent = 'Fuel entry saved.';
    formStatus.className = 'form-status';
    await loadEntries();
}

fuelForm?.addEventListener('submit', saveEntry);

const themeToggle = document.querySelector('.theme-toggle');
const savedTheme = localStorage.getItem('gassy-theme');
if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dark-mode');
}

themeToggle?.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('gassy-theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
});

loadEntries();
