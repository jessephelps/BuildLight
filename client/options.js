$("form#tcoptions").submit(function(e){
    e.preventDefault();
    
    var data = {}
    var Form = this;

    $.each(this.elements, function(i, v){
        var input = $(v);
        data[input.attr("name")] = input.val();
        delete data["undefined"];
    });

    $.ajax({
        cache: false,
        url : "config",
        type: "POST",
        dataType : "json",
        data : JSON.stringify(data),
        context : Form,
        success : function(callback){
            //Where $(this) => context == FORM
            console.log(JSON.parse(callback));
            $(this).html("Success!");
        },
        error : function(){
            $(this).html("Error!");
        }
    });
});

$("#submitForm").click(function () {
    $("form#tcoptions").submit()
});

$('#add-tcoption').on('click', function(e) {
    $("#tcoptions-container").append(
        "<form>" +
            "<div class='tcoption'>" + 
                "<span>Config Name:</span><input name='config-name' /><br />" +
                "<span>Host:</span><input name='host' placeholder='teamcity.pomiet.com' /><br />" +
                "<span>Path:</span><input name='path' value='/httpAuth/app/rest/buildTypes' /><br />" +
                "<span>Username:</span><input name='username' placeholder='username'/><br />" +
                "<span>Password:</span><input name='password' placeholder='password'/><br />" +
                "<button id='remove-tcoption'>Remove</button>" +
             "</div>" +
        "</form>"
    );
});

$("#remove-tcoption").on("click", function(e) {
    socket.emit('assign bulb', { 
        bulb: $('input[name=bulb]:checked').val(),
        config: $('input[name=config]:checked').val(),
    });
});