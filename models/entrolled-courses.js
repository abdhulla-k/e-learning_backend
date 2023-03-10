const mongoose = require('mongoose')

const Schema = mongoose.Schema

const courseSchema = new Schema({
  courseId: {
    type: mongoose.Types.ObjectId,
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  }
})

const entrolleCourseSchema = new Schema({
  userId: {
    type: mongoose.Types.ObjectId,
    required: true
  },
  courses: [courseSchema]
})

module.exports = mongoose.model('EntrolledCourse', entrolleCourseSchema)
