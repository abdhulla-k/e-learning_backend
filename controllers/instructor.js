// import models
const Instructor = require('../models/instructor')
const Token = require('../models/tocken')
const Course = require('../models/courses')

// import multer
const multer = require('multer')

// multer path and disk setted for saving the image while creating the course
const storageo = multer.diskStorage({
  // set the destination to save the files
  destination: (req, fiel, callback) => {
    callback(null, './public/images/')
  },
  filename: (req, file, callback) => {
    const uniqueName = `${Date.now()}_${file.originalname}`
    callback(null, uniqueName)
  }
})

// multer path and disk setted for saving the files of module while adding module
const moduleStorage = multer.diskStorage({
  // set the destination to save the files
  destination: (req, fiel, callback) => {
    callback(null, './public/modules/')
  },
  filename: (req, file, callback) => {
    const uniqueName = `${Date.now()}_${file.originalname}`
    callback(null, uniqueName)
  }
})

// import bcrypt
const bcrypt = require('bcryptjs')

// import jwt
const jwt = require('jsonwebtoken')

// import email facility
const emailSend = require('../util/send_email')

// import crypto to generate tocken
const crypto = require('crypto')

// singup controller
module.exports.singup = (req, res, next) => {
  // obtain all data user entered in signup form
  try {
    const signupData = {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password
    }

    // set salt round to bcrypt the password
    const saltRound = 10

    // check is it exist or not
    Instructor.find({
      email: signupData.email
    }, (err, data) => {
      if (err) {
        console.log(err)
      } else {
        console.log(data)

        // save user if it is not exist in database
        if (data.length <= 0) {
          console.log(`length: ${data.length}`)
          // bcrypt the password
          bcrypt.genSalt(saltRound, (saltError, salt) => {
            if (saltError) {
              throw saltError
            } else {
              bcrypt.hash(signupData.password, salt, (hashError, hash) => {
                if (hashError) {
                  console.log(hashError)
                  throw hashError
                } else {
                  // create User object or document
                  const user = new Instructor({
                    name: signupData.name,
                    email: signupData.email,
                    password: hash,
                    user_verified: false
                  })
                  // save user data
                  user.save().then(createdData => {
                    // create a tocken and save it in tocken collection to verify email.
                    const token = new Token({
                      userId: createdData.id,
                      token: crypto.randomBytes(32).toString('hex')
                    })
                    token.save().then(data => {
                      console.log(data)
                      // send account verification email
                      console.log('start')
                      emailSend(
                        createdData.email,
                        'successfully created your account.please verify',
                        `${process.env.BASE_URL_INST}${createdData.id}/${token.token}`)
                        .then(status => {
                          // send response
                          res.json({
                            status: 200,
                            message: 'account successfully created. please verify your account'
                          })
                        })
                        .catch(err => {
                          if (err) {
                            res.json({ message: 'problem faced while creating tocken. please use resend email!' })
                          }
                        })
                    })
                  })
                    .catch(err => {
                      // handling error
                      if (err) {
                        res.json({ message: 'problem faced while saving data' })
                      }
                    })
                }
              })
            }
          })
        } else {
          // send response
          res.json({ status: 409, message: 'email already exists' })
        }
      }
    })
  } catch {
    console.log('error')
  }
}

// to verify email id
exports.verifyEmail = async (req, res, next) => {
  try {
    const user = await Instructor.findOne({ _id: req.params.id })
    console.log(`user: ${user}`)
    if (!user) return res.json({ message: 'Invalid user', status: false })
    // if (!user) return res.status(400).send({ message: 'Invalid user', status: false })

    // check is it a valid user id
    const token = await Token.findOne({
      userId: user._id,
      token: req.params.token
    })

    // if there is no user exist
    if (!user) return res.json({ message: 'Invalid user', status: false })

    await Instructor.updateOne({ _id: user._id }, { userVerified: true })
    await Token.findByIdAndRemove(token._id)
    res.send({ message: 'email verified sucessfully', status: true })
  } catch (error) {
    // res.status(400).send({ message: 'An error occured', status: false })
    res.json({ message: 'An error occured', status: false })
  }
}

// login controller
module.exports.login = (req, res, next) => {
  const loginData = {
    email: req.body.email,
    password: req.body.password
  }

  Instructor.findOne({ email: loginData.email }).then(data => {
    if (data) {
      // compare password if a user exist with the given email
      bcrypt.compare(
        loginData.password,
        data.password,
        (err, isMatch) => {
          if (err) {
            res.json({ message: 'error found while finding instructor' })
          } else if (!isMatch) {
            res.json({ message: 'wrong password' })
          } else {
            if (data.userVerified === true) {
              // create jwt token
              const jwtSecretKey = process.env.JWT_SECRET_KEY
              const tokenData = {
                time: Date(),
                userId: data.id
              }

              // generate token
              const token = jwt.sign(tokenData, jwtSecretKey)
              res.json({ jwtToken: token, message: 'instructor logged in', loggedIn: true, time: 10000000 })
            } else {
              res.json({ message: 'please verify your email' })
            }
          }
        }
      )
    } else {
      res.json({ message: 'email not exist', loggedIn: false })
    }
  })
    .catch(err => {
      if (err) {
        console.log(err)
        res.json({ message: 'error occured while finding instructor data', loggedIn: false })
      }
    })
}

// create course
// furst one is to save the image
module.exports.upload = multer({ storage: storageo }).single('image')
// second one is to create the course
module.exports.createCourse = async (req, res, next) => {
  // get the course data
  const courseData = {
    title: req.body.title,
    description: req.body.description,
    imgPath: req.file.path,
    imgName: req.file.filename,
    price: req.body.price,
    teacher: req.body.teacher
  }

  // create mongodb instance
  const course = new Course({
    ...courseData
  })

  // expecting an error while saving the data.
  // so use try catch
  try {
    // save the data
    const courseStatus = await course.save()
    if (courseStatus) {
      // return the data and status
      res.json({
        message: 'success fully created',
        status: true,
        id: courseStatus.id,
        courseDetails: {
          ...courseStatus
        }
      })
    }
  } catch {
    // send error status
    res.json({
      message: 'error occured while creating course! try again later',
      status: false
    })
  }
}

// check the course id exist or not while updating a module into an id
module.exports.productIdValidity = (req, res, next) => {
  try {
    // save the course id passed through route
    const productId = req.params.courseId
    // check is it the id valid or not
    Course.findById(productId).then(data => {
      if (data) {
        // id is valid.
        // go ahead to next middleware
        next()
      } else {
        // not valid
        // send a 404 response
        res.json({ message: 'wrong course id' })
      }
    }).catch(err => {
      // got some error while checking the validity of id
      // send the message to frontend
      if (err) {
        res.json({ message: 'error while accessing id' })
      }
    })
  } catch {
    // faced some unexpected error
    // send the message
    res.json({ message: 'unexpected error' })
  }
}

// to create module
// save the passed values to the multer and save the files in public folder
module.exports.saveModule = multer({ storage: moduleStorage }).fields([
  { name: 'video', maxCount: 1 },
  { name: 'note', maxCount: 1 },
  { name: 'question', maxCount: 1 }
])

// save the files details to data base
module.exports.createModule = async (req, res, next) => {
  // get the details passed from frontend
  const moduleDetails = {
    videoTitle: req.body.title,
    videoPath: req.files.video[0].path,
    notePath: req.files.note[0].path,
    questionPath: req.files.question[0].path
  }

  // expecting an error while saving the data
  try {
    // update or push the data to the modules array of the course
    const data = await Course.findByIdAndUpdate(req.params.courseId, {
      $push: {
        modules: { ...moduleDetails }
      }
    })

    // saved the data
    // send the success message
    if (data) {
      // fetch full course data to send to user
      const fullData = await Course.findById(req.params.courseId)
      if (fullData) {
        // send success message
        res.json({ message: 'successfully added module', courseData: fullData })
      }
    }
  } catch {
    // error found while saving data.
    // send error message
    res.json({ message: 'error while saveing the module' })
  }
}

// to update module
module.exports.updateModule = async (req, res, next) => {
  // save all the data send by user
  const moduleDetails = {
    videoTitle: req.body.title,
    videoPath: req.files.video[0].path,
    notePath: req.files.note[0].path,
    questionPath: req.files.question[0].path
  }

  // query to match while updating the module
  const query = { _id: req.params.courseId }
  // data to update
  const update = {
    $set: {
      'modules.$[i].videoTitle': moduleDetails.videoTitle,
      'modules.$[i].videoPath': moduleDetails.videoPath,
      'modules.$[i].notePath': moduleDetails.notePath,
      'modules.$[i].questionPath': moduleDetails.questionPath
    }
  }
  // options that should match
  const options = { arrayFilters: [{ 'i._id': req.params.moduleId }], new: true }
  // expect and error while updatin data
  try {
    // update the data
    const data = await Course.findOneAndUpdate(query, update, options)
    if (data) {
      // send the success message to user
      res.status(200).send({ message: 'successfully updated the module' })
    }
  } catch {
    // send error message to user
    res.status(500).send({ message: 'error while updating module' })
  }
}

// send the courses to frontend
module.exports.getCourses = async (req, res, next) => {
  // expect error while fetching data
  try {
    // get the index to skip data while fetching
    const index = req.params.index
    // get the course details
    const courses = await Course.find({}).skip(index * 10)
    // send it to instructor
    res.json(courses)
  } catch {
    // send error message
    res.json({ message: 'error while fetching data' })
  }
}

// instructor => courses => details
// to get the details of a course
module.exports.details = async (req, res, next) => {
  try {
    // get the course id from url
    const id = req.params.courseId
    if (id) {
      // retrive course details
      const product = await Course.findById(id)
      // check is it exist or not
      if (product) {
        // snd the response
        res.json(product)
      } else {
        // sind error message
        res.json({ message: 'product not found' })
      }
    } else {
      // send error message
      res.json({ message: 'wrong id' })
    }
  } catch {
    // send error message
    res.json({ message: 'error while finding details' })
  }
}

// delete an entire course
module.exports.deleteCourse = async (req, res, next) => {
  try {
    // recieve the course id
    const courseId = req.params.courseId

    // check is it valid id or not
    const course = await Course.findById(courseId)
    // send error message if there is no course with given id
    if (!course) res.json({ message: 'course not exist!', status: false })
    // delete if ther is course
    const status = await Course.findByIdAndDelete(courseId)
    // return success message
    if (status) res.json({ message: 'successfully deleted', status: true })
  } catch {
    // return success message
    res.json({ message: 'error while deleting the document', status: false })
  }
}

// delete a special module from a course
module.exports.deleteModule = async (req, res, next) => {
  // save course id and module id
  const courseId = req.params.courseId
  const moduleId = req.params.moduleId
  // expect an error while updating data
  try {
    // remove the module from database
    const doc = await Course.findByIdAndUpdate(courseId, { $pull: { modules: { _id: moduleId } } }, { new: true })
    if (doc) {
      // return the success message
      res.status(200).send({ message: 'successfully deleted' })
    }
  } catch {
    // return the error message
    res.status(500).send({ message: 'error while deleting module' })
  }
}
