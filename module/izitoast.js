function notif(status, why){
    if(status == "true"){

        iziToast.success({
            title: 'OK',
            message: why,
        });

        // playbtn.disabled = true;

    }
    if(status == "err"){

        iziToast.error({
            title: 'Erreur',
            message: why,
        })
        // playbtn.disabled = false;

    }
    if(status == "info"){

        iziToast.info({
            title: 'Info',
            message: why,
        })

        // playbtn.disabled = false;

    }
}