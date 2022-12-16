const formatPhone = (nomor) => {
    let no_telp = nomor.replace(/\D/g, "");

    if(no_telp.startsWith('0')){
        no_telp = '62' + no_telp.substring(1);
    }

    if(!no_telp.endsWith('@c.us')){
        no_telp += '@c.us';
    }

    return no_telp;
}

module.exports = formatPhone