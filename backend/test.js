const axios = require('axios');
async function test() {
    try {
        const res = await axios.post('http://localhost:8080/api/auth/login', {username: 'qa', password: 'qa'});
        const token = res.data.token;
        const headers = { Authorization: 'Bearer ' + token };
        
        const inbounds = await axios.get('http://localhost:8080/api/quality/inbound/search?excludeStatus=STEP5_FINAL_COMPLETE', { headers });
        const target = inbounds.data[0];
        
        target.qualityDecisionDate = '2026-03-22';
        target.quantity = 1200;
        
        console.log('Sending PUT to ' + target.id);
        const putRes = await axios.put('http://localhost:8080/api/quality/inbound/' + target.id, target, { headers });
        console.log('Success:', putRes.status);
    } catch(err) {
        if (err.response) {
            console.error('500 ERROR DATA:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.error(err);
        }
    }
}
test();
