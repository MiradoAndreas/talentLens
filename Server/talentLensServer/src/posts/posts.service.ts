import { HttpException, Injectable } from '@nestjs/common';
import { Post } from '../schemas/post.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreatePostDto } from './dtos/CreatePost.dto';
import { User } from '../schemas/user.schema';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<Post>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async createPost({ userId, ...createPostDto }: CreatePostDto) {
    const findUser = await this.userModel.findById(userId);

    if (!findUser) throw new HttpException('User not found', 404);

    const newPost = new this.postModel(createPostDto);

    const savedPost = await newPost.save();
    findUser.updateOne({
      $push: {
        posts: savedPost._id,
      },
    });

    return savedPost;
  }

  findPostById() {}
}
