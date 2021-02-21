const QuizEvents = {
    "Game Chat Messag": "OnChat",
    "game chat update": "OnChatUpdate",
    "New Spectator": "OnSpectator",
    "Spectator Left": "OnSpectatorLeft",
    "Player Left": "OnPlayerLeft",
    "Spectator Change To Player": "OnSpectatorToPlayer",
    "Player Changed To Spectator": "OnPlayerToSpectator",
    "quiz pause triggered": "OnPause",
    "quiz unpause triggered": "OnUnpause",
    "Rejoining Player": "OnPlayerRejoined",
    "quiz ready": "OnQuizReady",
    "play next song": "OnPlayNext",
    "guess phase over": "OnGuessPhaseOver",
    "quiz next video info": "OnNextVideoInfo",
    "answer results": "OnAnswerResults",
    "quiz over": "OnQuizOver",
    "Spectate Game": "OnSpectate",
    "Join Game": "OnJoin",

};

class Quiz {
    constructor(bot,ue,) {
        bot.addEventsFromObj( QuizEvents, this );
        this.bot = bot;
        this.userEvents = ue;

        this.evChat = ue.addEvent( 'ChatMessage' );
        this.evSpectator = ue.addEvent( 'SpectatorJoined' );
        this.evSpectatorLeft = ue.addEvent( 'SpectatorLeft' );
        this.evPlayerLeft = ue.addEvent( 'PlayerLeft' );
        this.evPlayerRejoined = ue.addEvent( 'PlayerRejoined' );
        this.evPauseToggle = ue.addEvent( 'PauseToggle' );
        this.evQuizReady = ue.addEvent( 'QuizReady' );
        this.evNextSong = ue.addEvent( 'NextSong' );
        this.evGuessPhaseOver = ue.addEvent( 'GuessPhaseOver' );
        this.evNextVideoInfo = ue.addEvent( 'NextVideoInfo' );
        this.evAnswerResults = ue.addEvent( 'AnswerResults' );
        this.evQuizOver = ue.addEvent( 'QuizOver' );

        this.evJoined = ue.addEvent( 'JoinedGame' );
        this.evSpectate = ue.addEvent( 'SpectatingGame' );
        this.evErrorJoining = ue.addEvent( 'ErrorJoining' );

        this.spectators = [];
        this.players = [];
        this.paused = false;

        this.totalSongCount;
    };

    toggleSkip( v ) {
        this.bot.SendMessage( 'quiz', 'skip vote', { skipVote: v } );
    }

    OnJoin( payload ) {        
        if( payload.response ) return this.evErrorJoining.trigger(payload.errorMsg);

        this.spectators = [];
        payload.spectators.forEach( (spectator)=>{
            this.spectators.push( spectator );
        });            
        this.evJoined.trigger(payload);
    }

    OnSpectate( payload ) {
        if( payload.response ) return this.evErrorJoining.trigger(payload.errorMsg);

        this.spectators = [];
        payload.spectators.forEach( (spectator)=>{
            this.spectators.push( spectator );
        });
        this.evSpectate.trigger(payload);
    }

    sendChat( msg ) {
        this.bot.sendMessage( "lobby", "game chat message", {
            msg: msg,
            teamMessage: false
        } );        
    }

    sendAnswer( answer ) { // man i'm not happy that i'm writing this
        this.bot.sendMessage( "quiz", "quiz answer", {
            answer: answer,
            isPlaying: true, // probably something to do with the anti cheat but im not about to find out :) 
            volumeAtMax: true
            } );        
    }

    newHost( name ) {

    }

    OnQuizOver( payload ) {
        this.evQuizOver.trigger( payload );
    }

    OnAnswerResults( payload ) {
        this.evAnswerResults.trigger( payload );
    }  

    OnNextVideoInfo( payload ) {
        this.evNextVideoInfo.trigger( payload );
    }

    OnPlayNext( payload ) {
        this.evNextSong.trigger( payload );
    }

    OnGuessPhaseOver( ) {
        this.evGuessPhaseOver.trigger();
    }

    OnQuizReady( payload ) {
        this.totalSongCount = payload.numberOfSongs;
        this.evQuizReady.trigger( payload.numberOfSongs );
    }

    OnPlayerRejoined( payload ) {
        this.evPlayerRejoined.trigger(payload);
    }

    OnChat( payload ) { 
        this.evChat.trigger( payload.sender, payload.message );
    }

    OnChatUpdate( payload ){
        payload.messages.forEach( message=>{
            this.evChat.trigger( message.sender, message.message );
        });
        // don't care
    }

    OnSpectator( payload ){ 
        this.spectators.push( payload );

        this.evSpectator.trigger( payload );
    }

    removeSpectator( name ) {
        for( let i in this.spectators ) {
            if( this.spectators[i].name === name ) {
                this.spectators.splice( i, 1 );
                break;
            }
        }
    }

    OnSpectatorLeft( payload ){ 
        // if( payload.kicked )
        if( payload.newHost ) 
            this.newHost( payload.newHost );
        this.removeSpectator( payload.spectator );

        this.evSpectatorLeft.trigger( payload );
    }

    OnPlayerLeft( payload ) {           
        if( payload.newHost )
            this.newHost( payload.newHost );
        this.evPlayerLeft.trigger( payload.player, payload.kicked );
    }

    OnSpectatorToPlayer( payload ) {
        this.removeSpectator( payload.name );
    }

    OnPause( payload ) {
        this.paused = true;
        this.evPauseToggle( true );
    }

    OnUnpause( payload ) {
        this.paused = false;
        this.evPauseToggle( false );
    }
};

module.exports = Quiz;