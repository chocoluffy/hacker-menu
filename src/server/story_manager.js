import Events from 'events'
import Firebase from 'firebase'
import Moment from 'moment'
import URL from 'url'
import _ from 'lodash'
import async from 'async'
import StoryType from '../model/story_type'
import StoryManagerStatus from '../model/story_manager_status'
import request from 'request'

export default class StoryManager extends Events.EventEmitter {
  constructor (maxNumOfStories, cache) {
    super()
    this.maxNumOfStories = maxNumOfStories
    this.fb = new Firebase('https://hacker-news.firebaseio.com/v0')
    this.cache = cache
    this.stories = {}
  }

  fetchStory (storyId, callback) {
    var self = this

    var error = function (err) {
      callback(err)
    }

    var success = function (storySnapshot) {
      var story = storySnapshot.val()
      if (!story) {
        callback(new Error('Error loading ' + storySnapshot.key()))
        return
      }

      story.timeAgo = Moment.unix(story.time).fromNow()
      story.yurl = self.getYurl(story.id)
      story.by_url = self.getByUrl(story.by)
      if (_.isEmpty(story.url)) {
        story.url = story.yurl
      } else {
        story.host = URL.parse(story.url).hostname
      }
      if (_.isUndefined(story.descendants)) {
        story.descendants = 0
      }

      if (self.cache.contains(story.id)) {
        story.hasRead = true
      } else {
        story.hasRead = false
      }

      // console.log(JSON.stringify(story, null, 2))

      callback(null, story)
    }

    self.fb.child('item/' + storyId).once('value', success, error)
  }

  fetch (type, callback) {
    var self = this

    var error = function (err) {
      callback(err)
    }

    request('http://news.at.zhihu.com/api/2/news/latest', function (error, response, body) {
      self.emit('story-manager-status', { type: type, status: StoryManagerStatus.SYNCING_STATUS })
      if (!error && response.statusCode == 200) {
        var result = JSON.parse(body);
        callback(null, result.news);
        self.emit('story-manager-status', { type: type, status: StoryManagerStatus.UPDATED_STATUS })
      } else {
        callback(error, null);
      }
    });
  }

  watch (type, callback) {
    var self = this

    if (callback) {
      self.on(type, callback)
    }

    var error = function (err) {
      self.emit(type, err)
    }

    var success = function (storyIds) {
      self.emit('story-manager-status', { type: type, status: StoryManagerStatus.SYNCING_STATUS })
      async.map(storyIds.val(), self.fetchStory.bind(self), function (err, stories) {
        self.emit(type, err, stories)
        if (err) {
          return
        }

        self.emit('story-manager-status', { type: type, status: StoryManagerStatus.UPDATED_STATUS })

        if (!self.stories[type]) {
          self.stories[type] = []
        }
        var newStories = self.filterNewStories(stories, self.stories[type])
        if (!_.isEmpty(newStories)) {
          self.emit('new-story', newStories)
        }
        self.stories[type] = stories
      })
    }

    self.fb.child(self.getChildName(type)).limitToFirst(self.maxNumOfStories).on('value', success, error)
  }

  filterNewStories (updatedStories, oldStories) {
    return _.filter(updatedStories, function (story) {
      return !story.hasRead && !_.findWhere(oldStories, { id: story.id })
    })
  }

  getYurl (id) {
    return 'https://news.ycombinator.com/item?id=' + id
  }

  getByUrl (by) {
    return 'https://news.ycombinator.com/user?id=' + by
  }

  getChildName (type) {
    var child = ''
    if (type === StoryType.TOP_TYPE) {
      child = 'topstories'
    } else if (type === StoryType.SHOW_TYPE) {
      child = 'showstories'
    } else if (type === StoryType.ASK_TYPE) {
      child = 'askstories'
    } else {
      throw new Error('Unsupported watch type ' + type)
    }

    return child
  }
}
