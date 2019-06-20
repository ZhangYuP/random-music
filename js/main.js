var EventCenter = {
  on: function(type, handler){
    $(document).on(type, handler)
  },
  fire: function(type, data){
    $(document).trigger(type, data)
  }
}


var Footer = {
  init() {
    this.$footer = $('footer')
    this.$ul = this.$footer.find('ul')
    this.$box = this.$footer.find('.box')
    this.$leftBtn = this.$footer.find('.icon-left')
    this.$rightBtn = this.$footer.find('.icon-right')
    this.isAnimate = false
    this.bind()
    this.render()
  },

  bind() {
    $(window).resize(()=>{
      this.setStyle()
    })

    this.$rightBtn.on('click', ()=>{
      if(this.isAnimate) return
      var width = this.$footer.find('li').outerWidth(true)
      var distance = parseInt(this.$box.width() / width) * width
      if(this.$ul.position().left + this.$ul.width() > distance){
        this.isAnimate = true
        this.$ul.animate({left: '-=' + distance}, 400, ()=>{
          this.isAnimate = false
        })
      }      
    })

    this.$leftBtn.on('click', ()=>{
      if(this.isAnimate) return
      var width = this.$footer.find('li').outerWidth(true)
      var distance = parseInt(this.$box.width() / width) * width
      if(this.$ul.position().left < 0){
        this.isAnimate = true
        this.$ul.animate({left: '+=' + distance}, 400, ()=>{
          this.isAnimate = false
        })
      }
    })
    
    this.$footer.on('click', 'li', function(){
      $(this).addClass('active')
        .siblings().removeClass('active')
      
      EventCenter.fire('select-album', {
        channelId: $(this).attr('data-channel-id'),
        channelName: $(this).attr('data-channel-name')
      })
    })

    EventCenter.on('reset-album', (e, channelId)=>{
      this.$footer.find(`[data-channel-id=${channelId}]`).addClass('active')
      .siblings().removeClass('active')
    })
  },
  
  render() {
    $.ajax({
      url: 'https://jirenguapi.applinzi.com/fm/getChannels.php',
      dataType: 'json'
    }).then(
      (ret)=>{
        this.renderFooter(ret.channels)
      },
      ()=>{console.log('error')
    })
  },

  renderFooter(channels) {
    var html = ''
    channels.forEach(function(channel){
      html += `<li data-channel-id="${channel.channel_id}" data-channel-name="${channel.name}"><div class="cover" style="background-image:url('${channel.cover_small}')"></div><h3>${channel.name}</h3></li>`
    })
    this.$ul.html(html)
    this.setStyle()
  },

  setStyle() {
    var count = this.$footer.find('li').length
    var width = this.$footer.find('li').outerWidth(true)
    this.$ul.css({
      width: count * width + 'px'
    })
  }

}

var Fm = {
  init() {
    this.$main = $('main')
    this.audio = new Audio()
    this.audio.autoplay = 'autoplay'
    this.bind()
    this.list = []
  },
  bind() {
    var _this = this
    EventCenter.on('select-album', function(e, options){
      _this.channelId = options.channelId
      _this.channelName = options.channelName
      _this.loadMusic()
    })
    this.$main.find('.btn-play').on('click', function(){
      var $btn = $(this)
      if($btn.hasClass('icon-play')){
        $btn.removeClass('icon-play').addClass('icon-pause')
        _this.audio.play()
      }else{
        $btn.removeClass('icon-pause').addClass('icon-play')
        _this.audio.pause()
      }
    })
    this.$main.find('.btn-next').on('click', function(){
      _this.loadMusic()
    })
    this.$main.find('.btn-pre').on('click', function(){
      if(_this.list.length > 1){
        _this.list.pop()
        _this.song = _this.list[_this.list.length - 1].song
        _this.channelId = _this.list[_this.list.length - 1].channelId
        _this.channelName = _this.list[_this.list.length - 1].channelName
        _this.setMusic()

        EventCenter.fire('reset-album', _this.channelId)
      }
    })
    this.audio.addEventListener('play', function(){
      clearInterval(_this.statusClock)
      _this.statusClock = setInterval(function(){
        _this.updateStatus()
      }, 1000)
    })
    this.audio.addEventListener('pause', function(){
      clearInterval(_this.statusClock)
    })

  },
  loadMusic() {
    $.ajax({
      url: 'https://jirenguapi.applinzi.com/fm/getSong.php',
      dataType: 'json',
      data: {channel: 'this.channelId'}
    }).then((ret)=>{
      this.song = ret['song'][0]
      if(!this.song.url){
        this.loadMusic()
      }else{
        this.loadLyric()
        this.setMusic()
        this.list.push({song: this.song, channelId: this.channelId, channelName: this.channelName})
      }
    })
  },
  loadLyric() {
    $.ajax({
      url: 'https://jirenguapi.applinzi.com/fm/getLyric.php',
      dataType: 'json',
      data: {sid: this.song.sid}
    }).then((ret)=>{
      var lyric = ret.lyric
      this.lyricObj = {}
      lyric.split('\n').forEach((line)=>{
        var times = line.match(/\d{2}:\d{2}/g)
        var str = line.replace(/\[.+?\]/g, '')
        if(times){
          times.forEach((time)=>{
            this.lyricObj[time] = str
          })
        }
      })
    })
  },
  setMusic() {
    this.audio.src = this.song.url
    $('.bg').css('background-image', `url(${this.song.picture})`)
    this.$main.find('aside figure').css('background-image', `url(${this.song.picture})`)
    this.$main.find('.info .tag').text(this.channelName)
    this.$main.find('.info h1').text(this.song.title)
    this.$main.find('.info .artist').text(this.song.artist)
    this.$main.find('.btn-play').removeClass('icon-play').addClass('icon-pause')
  },
  updateStatus() {
    var min = Math.floor(this.audio.currentTime / 60) + ''
    var second = Math.floor(this.audio.currentTime % 60) + ''
    second = second.length === 2 ? second : '0' + second
    this.$main.find('.currentTime').text(min + ':' + second)
    this.$main.find('.progress').width(this.audio.currentTime/this.audio.duration*100 + '%')
    var line = this.lyricObj[(min.length === 1 ? '0' + min : min) + ':' + second]
    if(line){
      this.$main.find('.info .lyric').text(line)
    }
  }
}

Footer.init()
Fm.init()
