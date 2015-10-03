import React from 'react'

export default class Story extends React.Component {
  markAsRead () {
    this.props.onMarkAsRead(this.props.story.id)
  }

  openUrl (url) {
    this.props.onUrlClick(url)
  }

  handleUrlClick (e) {
    e.preventDefault()
    this.markAsRead()
    this.openUrl(this.props.story.share_url)
  }

  render () {
    var story = this.props.story
    var storyState
    if (story.hasRead) {
      storyState = 'story read'
    } else {
      storyState = 'story'
    }
    return (
      <div className={storyState}>
        <img className='image' src={story.image}>
        <div className='media-body'>
          <span className='story-title clickable' onClick={this.handleUrlClick.bind(this)}>{story.title}</span>
        </div>
          </img>
      </div>
    )
  }
}

Story.propTypes = {
  onUrlClick: React.PropTypes.func.isRequired,
  onMarkAsRead: React.PropTypes.func.isRequired,
  story: React.PropTypes.object.isRequired
}
