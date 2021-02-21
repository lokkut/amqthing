let AMQBot = require("./amqbot.js");

let Bot = new AMQBot(); 

Bot.on('Login', ( LoginData )=> {
    Bot.roomBrowser.getRooms();
} );

Bot.on('NewRoom', ( room ) => {
    if( room.settings.roomName == 'dooms' ) {
        Bot.roomBrowser.joinRoom( room.id, 'corgi' );
    }
} );

Bot.on('ErrorJoining', ( E ) => {
    console.log( E );
});

Bot.on('JoinedGame', ( Response ) => {    
    // nice
    Bot.quiz.setReady( true );
    Bot.roomBrowser.stopListening();
} );

Bot.on('QuizOver', ( Response ) => {
    Bot.quiz.setReady( true );
} );

Bot.on('QuizSettingsChanged', ( Payload ) => {
    Bot.quiz.setReady( true );
} );

// let SongIds = [];

Bot.on('NextVideoInfo',(Payload) => {
    // SongIds.push( Payload.videoInfo.id );
    Bot.quiz.videoReady( Payload.videoInfo.id );
} );

Bot.on('AnswerResults', () => {
    Bot.quiz.toggleSkip( true );
    // let id = SongIds.shift();
    // Bot.quiz.videoReady( id );
} );

// as we all know, it's never not been hinako note
Bot.on('NextSong', (a) => {
    Bot.quiz.sendAnswer( 'Hinako Note' );
    Bot.quiz.toggleSkip( true );
} );

Bot.init( 'mrtest1', 'asdasdasd' );