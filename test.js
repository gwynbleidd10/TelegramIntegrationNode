require('dotenv').config()

const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://" + process.env.MDB_USER + ":" + process.env.MDB_PASS + "@minare0.eswxz.mongodb.net/";

async function MDBFindOne(filter) {
    const client = await MongoClient.connect(uri, { useNewUrlParser: true });
    const collection = client.db(process.env.MDB_DB).collection('esed');
    const result = await collection.findOne(filter);
    client.close();
    return result;
}
async function MDBFind(filter) {
    const client = await MongoClient.connect(uri, { useNewUrlParser: true, poolSize: 10 });
    const collection = client.db(process.env.MDB_DB).collection('esed');
    const result = await collection.find(filter).toArray();
    client.close();
    return result;
}

async function aaa() {
    const res = await MDBFind({tg: ''});
    console.log(res);
}

aaa();