const bcrypt = require('bcrypt');

const asesores = [
  { email: 'ellibertador25@ngsoabogados.com', cedula: '1001216235' },
  { email: 'ellibertador4@ngsoabogados.com', cedula: '1018441492' },
  { email: 'ellibertador28@ngsoabogados.com', cedula: '1019073284' },
  { email: 'ellibertador56@ngsoabogados.com', cedula: '1018454151' },
  { email: 'ellibertador1@ngsoabogados.com', cedula: '1001275619' },
  { email: 'ellibertador67@ngsoabogados.com', cedula: '1014284618' },
  { email: 'ellibertador47@ngsoabogados.com', cedula: '1138074284' },
  { email: 'ellibertador5@ngsoabogados.com', cedula: '1033685482' },
  { email: 'ellibertador45@ngsoabogados.com', cedula: '1001116838' },
  { email: 'ellibertador17@ngsoabogados.com', cedula: '1000727404' },
  { email: 'ellibertador46@ngsoabogados.com', cedula: '52756032' },
  { email: 'ellibertador70@ngsoabogados.com', cedula: '1024593276' },
  { email: 'ellibertador52@ngsoabogados.com', cedula: '1000218098' },
  { email: 'ellibertador22@ngsoabogados.com', cedula: '1001286177' },
  { email: 'ellibertador14@ngsoabogados.com', cedula: '1032677388' },
  { email: 'ellibertador35@ngsoabogados.com', cedula: '1000338067' },
  { email: 'ellibertador10@ngsoabogados.com', cedula: '1013689282' },
  { email: 'ellibertador49@ngsoabogados.com', cedula: '1012434013' },
  { email: 'ellibertador20@ngsoabogados.com', cedula: '1002525594' },
  { email: 'ellibertador48@ngsoabogados.com', cedula: '52837437' },
  { email: 'ellibertador3@ngsoabogados.com', cedula: '1018439309' },
  { email: 'ellibertador68@ngsoabogados.com', cedula: '1016106935' },
  { email: 'ellibertador58@ngsoabogados.com', cedula: '1033684323' },
  { email: 'ellibertador36@ngsoabogados.com', cedula: '1000250399' },
  { email: 'ellibertador32@ngsoabogados.com', cedula: '1103111733' },
  { email: 'ellibertador40@ngsoabogados.com', cedula: '52889704' },
  { email: 'ellibertador11@ngsoabogados.com', cedula: '1000774584' },
  { email: 'ellibertador322@ngsoabogados.com', cedula: '1002208098' },
  { email: 'ellibertador8@ngsoabogados.com', cedula: '1000225422' },
  { email: 'ellibertador19@ngsoabogados.com', cedula: '1019152466' },
  { email: 'ellibertador7@ngsoabogados.com', cedula: '1020811040' },
  { email: 'ellibertador60@ngsoabogados.com', cedula: '1129508557' },
  { email: 'ellibertador2@ngsoabogados.com', cedula: '1057014128' },
  { email: 'ellibertador31@ngsoabogados.com', cedula: '1022443548' },
  { email: 'ellibertador12@ngsoabogados.com', cedula: '1001193173' },
  { email: 'ellibertador6@ngsoabogados.com', cedula: '1019137477' },
  { email: 'asesor2@exialegal.com', cedula: '1020760952' }
];

(async () => {
  for (const a of asesores) {
    const hash = await bcrypt.hash(a.cedula, 10);
    console.log(`UPDATE users SET password = '${hash}' WHERE email = '${a.email}';`);
  }
})();
