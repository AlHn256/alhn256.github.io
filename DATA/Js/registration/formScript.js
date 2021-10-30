//пишем функцию для привязки события onsubmit нашей формы
window.onload = function () {
	var	myform = document.getElementById("myForm");//находим элемент нашей формы по id
	myform.onsubmit = proverka //привязываем событие onsubmit по наступлению которого будет запускаться функция proverka
}
//пишем функцию для цикличного запускания функций по добавлению полей
function isMore (){
	var form = document.getElementById("myTable");//находим элемент таблица по ее id
		if (!document.getElementById("metka")){  //условие по которому функция будет определять открыта ли форма или нет
			for (var i=1; i<=6; i++){  //если форма закрыта, то циклом по таймауту  запускаем функции добавления полей
				var p = "pole"+i+"()";//формирование названия нашей функции 
				var t1 = i * 200;//расчет времени таймаута
				var t =100 + t1;//расчет времени таймаута
				setTimeout (p,t)//запуск функций через определенное количество времени
			}
			var myIn = document.getElementById("myIn");//находим кнопку «расширенная форма» по id
			myIn.setAttribute("value", "  Обычная форма  " );//меняем название кнопки на «обычная форма»
			myIn.removeAttribute("ONCLICK");/*удаляем атрибут ONCLICK, для того чтобы в процессе выполнения кода 
			сам код нельзя было запустить еще раз*/ 	
		}
		else
			isNormal();//если форма уже открыта, то запускаем функцию по удалению полей для расширенной формы 
}
//функция по запуску плавного удаления полей формы
function isNormal(){
	var	form = document.getElementById("myTable");//находим элемент таблица по ее id
	var del = form.getElementsByTagName("TR");//находим все теги tr в нашей таблице
			for (var i = 9; i < del.length; i--){ //цикл по запуску функций для удаления полей, по таймауту
				if (i==3){ //если цикл доходит до 3 поля то он прекращается, чтобы у нас обязательные поля не удалились 
					break;
			  } else 
				var fun = "deleteTR"+"("+i+")";/*формирование названия функции по удалению нашей строки в таблице, 
				т.е. всех полей в этой строке*/
				var t1 = i * 100;//расчет времени таймаута
				var t =1000 - t1;//расчет времени таймаута
				setTimeout (fun,t)//запуск функций через определенное количество времени
		}
		var myIn = document.getElementById("myIn");//находим кнопку «обычная форма» по id
		myIn.setAttribute("value", "Расширенная форма" );/*меняем название кнопки на «расширенная форма», 	
		так как мы ее свернули*/
}
//функция по удалению строк, параметром передаем номер строки
function deleteTR (number){
	var form = document.getElementById("myTable");//находим элемент таблица по ее id
    var del = form.getElementsByTagName("TR");//находим все теги tr в нашей таблице
		del[number].parentNode.removeChild(del[number]);//удаляем нужную нам строку
}
//функция для проверки правильности заполнения формы
function proverka (){
	var proverkaName = document.getElementById("prName");//находим элемент «имя» по id
	var proverkaEmail = document.getElementById("prEmail");//находим элемент «email» по id
	var proverkaPsw = document.getElementById("prPsw");//находим элемент «пароль» по id
		if (proverkaName.value=="" || proverkaEmail.value=="" || proverkaPsw.value==""){//условие проверки полей
			proverkaName = (proverkaName.value) ? "" : "Поле - имя\n"/*если в поле «имя» пусто то в переменную 	
			proverkaName вставляем "Поле – имя", для вывода в предупредительном сообщении*/
			proverkaEmail = (proverkaEmail.value) ? "" : "Поле - email\n"/*если в поле «email» пусто то в переменную
			proverkaEmail вставляем "Поле – email", для вывода в предупредительном сообщении */
			proverkaPsw = (proverkaPsw.value) ? "" : "Поле - пароль\n"/*если в поле «пароль» пусто то в переменную 
			proverkaPsw вставляем "Поле – пароль", для вывода в предупредительном сообщении */
			alert ("Не заполнены следующие обязательные поля:\n"+proverkaName+proverkaEmail+proverkaPsw);/*формируем 
			предупредительное сообщение */
			return  false;/*прекращаем выполнения события onsubmit, для того чтобы наши «неправильные» 	
			данные не отправились на сервер */
		}
		else{
		//сообщение что данные заполнены правильно и отправились на сервер
			alert ("Данные успешно отправлены на сервер\nПримечание:\nНа самом деле эти данные никуда не отправлены, \
			Вам сначала необходимо настроить прием этих данных на своем сервере, т.е. настроить серверные скрипты");
		 return  false;/*для применения на действующем сайте эту строку необходимо удалить!!!
		 а то в случае правильного заполнения формы данные все равно не отправятся*/ 
		}
}
//функция выравнивания полей по центру
function alignCenter (){
	var form = document.getElementById("myTable");//находим элемент таблица по ее id
	var alCentr = form.getElementsByTagName("TR")//находим все теги tr в нашей таблице
		for (var i = 0; i < alCentr.length; i++){//циклом переберем все строки таблицы добавляем им атрибут align 
			alCentr[i].setAttribute("align", "center" );//добавляем строкам атрибут align
		}
}

/*Далее идут функции по добавлению строк в нашу форму, 
другими словами полей формы, они все однотипные, поэтому прокомментирую только первую*/
function pole1 () {
	var form = document.getElementById("myTable");//находим элемент таблица по ее id
	var tr = document.createElement("TR");//Создаем элемент tr
		form.appendChild(tr);//Привязываем его к нашей таблице
	var td = document.createElement("TD");//Создаем элемент td
		tr.appendChild(td);//Привязываем его к нашей строке
	var text = document.createTextNode("Отчество:");//Создаем текстовый узел
		td.appendChild(text);//Привязываем его к нашей ячейке
	var td = document.createElement("TD");//Создаем второй элемент td, т.е. второй столбец
		tr.appendChild(td);//Привязываем его к нашей строке
	var input = document.createElement("INPUT");//Создаем элемент INPUT, для ввода данных
		input.setAttribute("type", "text" );//Добавляем атрибут
		input.setAttribute("id", "metka" );//Добавляем атрибут
		input.setAttribute("name", "lastName" );//Добавляем атрибут
		td.appendChild(input);//Привязываем его к нашей ячейке
			alignCenter();//Запускаем функцию для выравнивания по центру
}

function pole2 (){
	var form = document.getElementById("myTable");
	var tr = document.createElement("TR");
		form.appendChild(tr);
	var td = document.createElement("TD");
		tr.appendChild(td);
	var text = document.createTextNode("Пол:");	
		td.appendChild(text);
	var td = document.createElement("TD");
		tr.appendChild(td);
	var input = document.createElement("INPUT");
		input.setAttribute("type", "RADIO" );
		input.setAttribute("name", "sex" );
		input.setAttribute("value", "man" );
		td.appendChild(input);
	var text = document.createTextNode("Мужской");
		td.appendChild(text);
	var input = document.createElement("INPUT");
		input.setAttribute("type", "RADIO" );
		input.setAttribute("name", "sex" );
		input.setAttribute("value", "woman" );
		td.appendChild(input);
	var text = document.createTextNode("Женский");
		td.appendChild(text);
			alignCenter();
}
function pole3 (){
	var form = document.getElementById("myTable");
	var tr = document.createElement("TR");
		form.appendChild(tr);
	var td = document.createElement("TD");
		tr.appendChild(td);
	var text = document.createTextNode("Год рождения");
		td.appendChild(text);
	var td = document.createElement("TD");
		tr.appendChild(td);
	var input = document.createElement("INPUT");
		input.setAttribute("type", "text" );
		input.setAttribute("name", "god" );
		td.appendChild(input);
			alignCenter();
}
function pole4 (){
	var form = document.getElementById("myTable");
	var tr = document.createElement("TR");
		form.appendChild(tr);
	var td = document.createElement("TD");
		tr.appendChild(td);
	var text = document.createTextNode("Страна");
		td.appendChild(text);
	var td = document.createElement("TD");
		tr.appendChild(td);
	var input = document.createElement("INPUT");
		input.setAttribute("type", "text" );
		input.setAttribute("name", "coutry" );
		td.appendChild(input);
			alignCenter();
}
function pole5 (){
	var form = document.getElementById("myTable");
	var tr = document.createElement("TR");
		form.appendChild(tr);
	var td = document.createElement("TD");
		tr.appendChild(td);
	var text = document.createTextNode("Город");
		td.appendChild(text);
	var td = document.createElement("TD");
		tr.appendChild(td);
	var input = document.createElement("INPUT");
		input.setAttribute("type", "text" );
		input.setAttribute("name", "city" );
		td.appendChild(input);
			alignCenter();
}
function pole6 (){
	var form = document.getElementById("myTable");
	var tr = document.createElement("TR");
		form.appendChild(tr);
	var td = document.createElement("TD");
		tr.appendChild(td);
	var text = document.createTextNode("Доп. информация");
		td.appendChild(text);
	var td = document.createElement("TD");
		tr.appendChild(td);
	var input = document.createElement("TEXTAREA");
		input.setAttribute("rows", "6" );
		input.setAttribute("cols", "21" );
		input.setAttribute("name", "dopinfo" );
		td.appendChild(input);
			alignCenter();
		var myIn = document.getElementById("myIn");//находим кнопку «расширенная форма» по id
	myIn.setAttribute("ONCLICK","isMore()");//возвращаем ей втрибут ONCLICK
}