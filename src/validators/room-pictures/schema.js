import Joi from 'joi';

export const PostRoomPicturePayloadSchema = Joi.object({
  primaryFileName: Joi.string().required(),
  files: Joi.array().items(Joi.any()).min(1).required(), // file upload biasanya divalidasi tambahan di storage layer
});

export const RoomIdParamSchema = Joi.object({
  roomId: Joi.string().required(),
});

export const PictureIdParamSchema = Joi.object({
  pictureId: Joi.string().required(),
});
