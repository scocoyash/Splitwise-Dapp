const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const express = require('express')

const bodyParser = require('body-parser');
const cors = require('cors');

// region app
const app = express();

// parse body params and attache them to req.body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// enable CORS - Cross Origin Resource Sharing
app.use(cors());
// endregion

mongoose.connect('mongodb://127.0.0.1:27017/test');

const BalanceEntrySchema = Schema({
    address: String,
    value: String
});

const SignatureSchema = Schema({
    signer: String,
    v: String,
    r: String,
    s: String
});


const BillSchema = Schema({
    name: String,
    state: String,
    fullySigned: Boolean,
    totalAmount: String,
    totalBalanceChange: [BalanceEntrySchema],
    balanceChange: [BalanceEntrySchema],
    parts: [BalanceEntrySchema],
    payments: [BalanceEntrySchema],
    signatures: [SignatureSchema],
    group: { type: Schema.Types.ObjectId, ref: 'Group' },
    timestamp: Number
});

const UserModel = mongoose.model('User', Schema({
    name: String,
    signature: String
}));

const GroupModel = mongoose.model('Group', Schema({
    name: String,
    numParticipants: Number,
    bills: [BillSchema]
}));

const BillModel = mongoose.model('Bill', BillSchema);

const main = async () => {
    app.post('/group', async (req, res) => {
        console.log('body', req.body);

        const group = new GroupModel({
            name: req.body.name,
            numParticipants: req.body.numParticipants
        });

        await group.save();
        console.log('group saved');

        res.json(group);
    });

    app.post('/group/:group_name/bill', async (req, res) => {
        console.log('body', req.body);

        GroupModel.findOne({ name: req.params.group_name }, (err, group) => {
            console.log('/group/:group_name/bill', err, group);
            const bill = new BillModel({
                name: req.body.name,
                state: req.body.state,
                signatures: req.body.signatures,
                balanceChange: req.body.balanceChange,
                totalBalanceChange: req.body.totalBalanceChange,
                parts: req.body.parts,
                payments: req.body.payments,
                fullySigned: req.body.fullySigned || false,
                totalAmount: req.body.totalAmount,
                timestamp: new Date().getTime()
            });

            group.bills.push(bill);

            group.save();

            res.json(bill);
        });
    });

    
    app.get('/user/:user_signature', async (req, res) => {
        console.log('body', req.params.user_signature.toLowerCase() );

        UserModel.findOne({ signature: req.params.user_signature }, (err, user) => {
            console.log('/user/:user_signature', err, user);
            res.json(user);
        });
    });

    app.get('/group/:group_id/bills', async (req, res) => {
        GroupModel.findOne({ name: req.params.group_id }, (err, group) => {
            res.json(group && group.bills);
        });
    });

    app.get('/group/:group_id/last-bill-signed', async (req, res) => {
        GroupModel.findOne({ name: req.params.group_id }, (err, group) => {
            res.json(group && group.bills && group.bills.find(bill => bill.fullySigned));
        });
    });


    app.get('/group/:group_id/bills_not_signed/:address_id', async (req, res) => {
        GroupModel.findOne({ name: req.params.group_id }, (err, group) => {
            const notSigned = group.bills.filter(({ signatures }) => {
                return signatures.filter(({ signer }) => signer.toLowerCase() === req.params.address_id.toLowerCase()).length > 0
            });

            res.json(notSigned);
        });
    });

    app.post('/group/:group_id/bills/:bill_id/add-signature', async (req, res) => {
        if (!req.body.signature) {
            return res.json({
                error: 'No signature'
            });
        }

        GroupModel.findOne({ name: req.params.group_id }, async (err, group) => {
            const bill = group.bills.id(req.params.bill_id);

            if (bill.signatures.find(({ signer }) => signer.toLowerCase() === req.body.signature.signer.toLowerCase())) {
                return res.json({
                    error: 'Signature already present.'
                });
            }

            bill.signatures.push(req.body.signature);

            if (bill.signatures.length === group.numParticipants) {
                bill.fullySigned = true;
            }

            await group.save();

            res.json(bill);
        });
    });

    app.listen(3001, () => console.log('Example app listening on port 3001!'))
};

main();
