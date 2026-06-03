const bcrypt = require('bcryptjs');
const hash = '$2b$10$qNpXLBidA263Prlkd6zOL.E4Ym9cXiJKtaEvk0HiSTmKr7eX.K3dK';
console.log(bcrypt.compareSync('123456', hash));
