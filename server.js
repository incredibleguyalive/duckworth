const express = require('express');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const supabaseUrl = process.env.DATABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY; 

app.post('/paystack-webhook', async (req, res) => {
    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY)
                       .update(JSON.stringify(req.body))
                       .digest('hex');
                       
    if (hash !== req.headers['x-paystack-signature']) {
        return res.status(401).send('Unauthorized signature');
    }

    const event = req.body;
    if (event.event === 'charge.success') {
        const userEmail = event.data.customer.email;
        const amountPaidNgn = event.data.amount / 100;

        await supabase.rpc('increment_vault_balance', {
            row_email: userEmail,
            amount_to_add: amountPaidNgn
        });
    }
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  
