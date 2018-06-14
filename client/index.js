var socket = io();
var userId = "user";

$('form').submit(function() {
    socket.emit('chat message', {value: $('#m').val(), userId: userId});
    $('#m').val('');
    return false;
});

$('#identify-bulb').on('click', function(e) {
    socket.emit('identify bulb', { bulb: $('input[name=bulb]:checked').val() } );
});

$("#assign-bulb").on("click", function(e) {
    socket.emit('assign bulb', { 
        bulb: $('input[name=bulb]:checked').val(),
        config: $('input[name=config]:checked').val(),
    });
});

socket.on('connected bulbs', function(bulbs) {
    console.log(bulbs);
    $('#bulb-container').html("");
    for(var i = 0; i < bulbs.length; i++) {
        var bulb = bulbs[i];
        $('#bulb-container').append(
            $("<div id='" + bulb + "' class='bulb'>" +
                "<input type='radio' name='bulb' value='" + bulb + "' />" +
                "<span>"+bulb+"</span>" + 
              "</div>")
        );
    }
});

socket.on('teamcity configs', function(configs) {
    $('#teamcity-container').html("");
    for(var i = 0; i < configs.length; i++) {
        var tcconfig = configs[i];
        $('#teamcity-container').append(
            $("<div id='" + tcconfig.id + "' class='tc-config'>" +
                "<input type='radio' name='config' value='" + tcconfig.id + "' />" +
                "<span>"+tcconfig.projectName + " " + tcconfig.name +"</span>" + 
              "</div>")
        );
    }
});

socket.on('bulb detected', function(bulb) {
    console.log(bulb);
});

window.onunload = function(e) {
    socket.emit("user disconnect", userId);
}