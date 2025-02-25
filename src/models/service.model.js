const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Service name is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Description is required']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    duration: {
        type: Number,
        required: [true, 'Duration is required'],
        min: [1, 'Duration must be at least 1 minute']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['haircut', 'massage', 'facial', 'nails', 'makeup', 'spa', 'other'] // Add your categories as needed
    },
    image: {
        type: String,
        validate: {
            validator: function(v) {
                // Basic URL validation
                return !v || /^(http|https):\/\/[^ "]+$/.test(v);
            },
            message: props => `${props.value} is not a valid URL!`
        }
    },
    availability: {
        type: Boolean,
        default: true
    },
    ratings: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        review: String,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index for better search performance
serviceSchema.index({ name: 'text', description: 'text' });

// Virtual for formatting duration
serviceSchema.virtual('durationFormatted').get(function() {
    const hours = Math.floor(this.duration / 60);
    const minutes = this.duration % 60;
    return hours > 0 
        ? `${hours} hour${hours > 1 ? 's' : ''} ${minutes > 0 ? `${minutes} minutes` : ''}`
        : `${minutes} minutes`;
});

// Method to calculate and update average rating
serviceSchema.methods.updateAverageRating = async function() {
    if (this.ratings && this.ratings.length > 0) {
        const sum = this.ratings.reduce((acc, curr) => acc + curr.rating, 0);
        this.averageRating = sum / this.ratings.length;
    } else {
        this.averageRating = 0;
    }
    await this.save();
};

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service; 