var gitarre = {
	toggleMenu: function() {
		console.log('asd');
		$('#hidden-nav').html($('nav.top .text-nav').html()).toggle();
		return false;
	},
	testForm: function() {
		var _form = document.feedback_form;
		if(_form.name.value=="") {
			alert("Пожалуйста, введите имя."); 
			_form.member_name.focus(); 
			return; 
		}
		if(_form.message.value==""){ 
			alert("Пожалуйста, введите свой вопрос.");
			_form.message.focus(); 
			return; 
		}
		if(_form.email.value==""){ 
			alert("Пожалуйста, введите свой e-mail."); 
			_form.email.focus(); 
			return; 
		}
		pattern = /[^@]+@(\w+\.)+\w+/;
		if(!pattern.test(_form.email.value)) { 
			alert("Пожалуйста, введите корректный e-mail."); 
			_form.email.focus(); 
			return;
		}
		this.sendMessage();
	},
	
	sendMessage: function() {
		$('#send-message').hide();
		var data = $('#feedback_form').serialize();
		$.ajax({
			type: 'POST',
			url: '/api.php?module=Messenger&method=sendEmailToAdmin',
			data: data,
			error: function() {
				alert('При отправке сообщения произошла ошибка, которую не удалось обработать. Попробуйте позднее...');
				setTimeout(function(){document.location.href=document.location.href;}, 3000);
			},
			success: function(data) {
				if(data.error) {
					alert(data.error);
					setTimeout(function(){document.location.href=document.location.href;}, 3000);
				}
				else {
					$('#feedback_form .form-container').html('<p><em><strong>Ваше сообщение успешно отправлено. Вам ответят в ближайшее время.</strong></em></p>');
				}
			},
			dataType: 'json'
		});		
	},
	sendGrMessage: function() {
		$('#send-message').hide();
		var _form = document.feedback_form;
		var data = {
				'name': _form.member_name.value,
				'phone': _form.phone.value,
				'email': _form.email.value,
				'metro': _form.metro.value,
				'instrument': _form.instrument.options[_form.instrument.selectedIndex].value,
				'edu_type': _form.edu_type.options[_form.edu_type.selectedIndex].value,
		}
		data[___key] = _form.token.value;
		$.ajax({
			type: 'POST',
			url: '/api.php?module=Messenger&method=sendEmailToGrifon',
			data: data,
			error: function() {
				alert('При отправке заявки произошла ошибка, которую не удалось обработать. Попробуйте позднее...');
				setTimeout(function(){document.location.href=document.location.href;}, 3000);
			},
			success: function(data) {
				if(data.error) {
					alert(data.error);
					setTimeout(function(){document.location.href=document.location.href;}, 3000);
				}
				else {
					$('#feedback_form .form-container').html('<p><em><strong>Ваша заявка принята. С вами свяжутся в ближайшее время.</strong></em></p>');
				}
			},
			dataType: 'json'
		});		
	}
	
}

var guitarTuner = {
	run: function(button) {
		if($(button).hasClass('active')) {
			this.stopAll();
		}
		else {
			this.stopAll();
			if($(button).attr('id') != 'guitar-tuner-stop') {
				$('#audio-' + $(button).attr('id'))[0].play();
				$(button).addClass('active');
			}
		}
	},
	stopAll : function() {
		$('audio').each(function(){
			this.currentTime = 0;
			this.pause();
			$('.guitar-tuner-note').removeClass('active');
		});
	},
	
	changeTuner: function() {
		guitarTuner.stopAll();
		if($('#tuner-version a:first').hasClass('selected')) {
			$('#tuner-version a').removeClass('selected');
			$('#tuner-version a:last').addClass('selected');
			$('#guitar-tuner').css('display','none');
			$('#flash-guitar-tuner').css('display','block');
			$('#tuner-description').css('display','none');
			$('#flash-tuner-description').css('display','block');
		}
		else {
			$('#tuner-version a').removeClass('selected');
			$('#tuner-version a:first').addClass('selected');
			$('#flash-guitar-tuner').css('display','none');
			$('#guitar-tuner').css('display','block');
			$('#flash-tuner-description').css('display','none');
			$('#tuner-description').css('display','block');
		}
	}
}

$(document).ready(function(){
	$('.guitar-tuner-note').mouseenter(function(){
		$(this).addClass('hover');
	});
	$('.guitar-tuner-note').mouseleave(function(){
		$(this).removeClass('hover');
	});
	$('.guitar-tuner-note').click(function(){
		guitarTuner.run(this);
	});
	$('#tuner-version a').click(function(){
		guitarTuner.changeTuner();
	});
});