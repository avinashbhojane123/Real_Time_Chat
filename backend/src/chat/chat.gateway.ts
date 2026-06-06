// import {
//   WebSocketGateway,
//   WebSocketServer,
//   SubscribeMessage,
//   ConnectedSocket,
//   MessageBody,
//   OnGatewayConnection,
//   OnGatewayDisconnect,
// } from '@nestjs/websockets';

// import { Server, Socket } from 'socket.io';

// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';

// import { Room } from '../rooms/room.entity';
// import { Message } from '../messages/message.entity';
// import { User } from '../users/user.entity';

// @WebSocketGateway({
//   cors: {
//     origin: '*',
//   },
// })
// export class ChatGateway
//   implements OnGatewayConnection, OnGatewayDisconnect
// {
//   @WebSocketServer()
//   server!: Server;

//   constructor(
//     @InjectRepository(Room)
//     private readonly roomRepo: Repository<Room>,

//     @InjectRepository(Message)
//     private readonly messageRepo: Repository<Message>,

//     @InjectRepository(User)
//     private readonly userRepo: Repository<User>,
//   ) {}

//   private users = new Map<
//     string,
//     {
//       nickname: string;
//       passcode: string;
//     }
//   >();

//   handleConnection(client: Socket) {}

//   async handleDisconnect(client: Socket) {
//     const userInfo = this.users.get(client.id);

//     if (!userInfo) return;

//     const room = await this.roomRepo.findOne({
//       where: {
//         passcode: userInfo.passcode,
//       },
//     });

//     if (room) {
//       const user = await this.userRepo.findOne({
//         where: {
//           nickname: userInfo.nickname,
//           roomId: room.id,
//         },
//       });

//       if (user) {
//         user.isOnline = false;
//         user.lastSeen = new Date();

//         await this.userRepo.save(user);
//       }

//       const updatedUsers =
//         await this.userRepo.find({
//           where: {
//             roomId: room.id,
//           },
//           order: {
//             nickname: 'ASC',
//           },
//         });

//       this.server
//         .to(room.passcode)
//         .emit('usersList', updatedUsers);
//     }

//     this.server
//       .to(userInfo.passcode)
//       .emit('userOffline', {
//         nickname: userInfo.nickname,
//         lastSeen: new Date(),
//       });

//     this.server
//       .to(userInfo.passcode)
//       .emit('userLeft', {
//         nickname: userInfo.nickname,
//       });

//     this.users.delete(client.id);
//   }

//   @SubscribeMessage('joinRoom')
//   async joinRoom(
//     @MessageBody()
//     data: {
//       nickname: string;
//       passcode: string;
//     },
//     @ConnectedSocket()
//     client: Socket,
//   ) {
//     let room = await this.roomRepo.findOne({
//       where: {
//         passcode: data.passcode,
//       },
//     });

//     if (!room) {
//       room = this.roomRepo.create({
//         passcode: data.passcode,
//         roomName: `Room-${data.passcode}`,
//       });

//       room = await this.roomRepo.save(room);
//     }

//     let user = await this.userRepo.findOne({
//       where: {
//         nickname: data.nickname,
//         roomId: room.id,
//       },
//     });

//     if (!user) {
//       user = this.userRepo.create({
//         nickname: data.nickname,
//         roomId: room.id,
//         isOnline: true,
//       });
//     } else {
//       user.isOnline = true;
//       user.lastSeen = null;
//     }

//     await this.userRepo.save(user);

//     client.join(room.passcode);

//     this.users.set(client.id, {
//       nickname: data.nickname,
//       passcode: room.passcode,
//     });

//     const messages =
//       await this.messageRepo.find({
//         where: {
//           roomId: room.id,
//         },
//         order: {
//           createdAt: 'ASC',
//         },
//         take: 100,
//       });

//     client.emit(
//       'chatHistory',
//       messages,
//     );

//     const roomUsers =
//       await this.userRepo.find({
//         where: {
//           roomId: room.id,
//         },
//         order: {
//           nickname: 'ASC',
//         },
//       });

//     this.server
//       .to(room.passcode)
//       .emit('usersList', roomUsers);

//     this.server
//       .to(room.passcode)
//       .emit('userOnline', {
//         nickname: data.nickname,
//       });

//     this.server
//       .to(room.passcode)
//       .emit('userJoined', {
//         nickname: data.nickname,
//       });

//     return {
//       success: true,
//       roomId: room.id,
//       passcode: room.passcode,
//     };
//   }

//   @SubscribeMessage('sendMessage')
//   async sendMessage(
//     @MessageBody()
//     data: {
//       passcode: string;
//       nickname: string;
//       message: string;
//     },
//   ) {
//     const room =
//       await this.roomRepo.findOne({
//         where: {
//           passcode: data.passcode,
//         },
//       });

//     if (!room) {
//       return {
//         success: false,
//         message: 'Room not found',
//       };
//     }

//     const savedMessage =
//       this.messageRepo.create({
//         roomId: room.id,
//         nickname: data.nickname,
//         message: data.message,
//       });

//     await this.messageRepo.save(
//       savedMessage,
//     );

//     this.server
//       .to(room.passcode)
//       .emit('newMessage', {
//         id: savedMessage.id,
//         roomId: room.id,
//         nickname:
//           savedMessage.nickname,
//         message:
//           savedMessage.message,
//         createdAt:
//           savedMessage.createdAt,
//       });

//     return {
//       success: true,
//     };
//   }

//   @SubscribeMessage('getMessages')
//   async getMessages(
//     @MessageBody()
//     data: {
//       passcode: string;
//     },
//   ) {
//     const room =
//       await this.roomRepo.findOne({
//         where: {
//           passcode: data.passcode,
//         },
//       });

//     if (!room) {
//       return [];
//     }

//     return await this.messageRepo.find({
//       where: {
//         roomId: room.id,
//       },
//       order: {
//         createdAt: 'ASC',
//       },
//     });
//   }

//   @SubscribeMessage('getUsers')
//   async getUsers(
//     @MessageBody()
//     data: {
//       passcode: string;
//     },
//     @ConnectedSocket()
//     client: Socket,
//   ) {
//     const room =
//       await this.roomRepo.findOne({
//         where: {
//           passcode: data.passcode,
//         },
//       });

//     if (!room) {
//       client.emit(
//         'usersList',
//         [],
//       );
//       return;
//     }

//     const users =
//       await this.userRepo.find({
//         where: {
//           roomId: room.id,
//         },
//         order: {
//           nickname: 'ASC',
//         },
//       });

//     client.emit(
//       'usersList',
//       users,
//     );
//   }
// }

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Room } from '../rooms/room.entity';
import { Message } from '../messages/message.entity';
import { User } from '../users/user.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,

    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private users = new Map<
    string,
    {
      nickname: string;
      passcode: string;
    }
  >();

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  async handleDisconnect(client: Socket) {
    const userInfo = this.users.get(client.id);

    if (!userInfo) return;

    const room = await this.roomRepo.findOne({
      where: {
        passcode: userInfo.passcode,
      },
    });

    if (room) {
      const user = await this.userRepo.findOne({
        where: {
          nickname: userInfo.nickname,
          roomId: room.id,
        },
      });

      if (user) {
        user.isOnline = false;
        user.lastSeen = new Date();

        await this.userRepo.save(user);
      }

      const updatedUsers = await this.userRepo.find({
        where: {
          roomId: room.id,
        },
        order: {
          nickname: 'ASC',
        },
      });

      this.server.to(room.passcode).emit(
        'usersList',
        updatedUsers.map((user) => ({
          id: user.id,
          nickname: user.nickname,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          deviceType: user.deviceType,
          deviceModel: user.deviceModel,
          browser: user.browser,
          os: user.os,
        })),
      );
    }

    this.server
      .to(userInfo.passcode)
      .emit('userOffline', {
        nickname: userInfo.nickname,
        lastSeen: new Date(),
      });

    this.server
      .to(userInfo.passcode)
      .emit('userLeft', {
        nickname: userInfo.nickname,
      });

    this.users.delete(client.id);
  }

  @SubscribeMessage('joinRoom')
  async joinRoom(
    @MessageBody()
    data: {
      nickname: string;
      passcode: string;
      deviceType?: string;
      deviceModel?: string;
      browser?: string;
      os?: string;
    },
    @ConnectedSocket()
    client: Socket,
  ) {
    console.log(
      'JOIN ROOM:',
      data.nickname,
      data.deviceType || '',
      data.deviceModel || '',
      data.browser || '',
      data.os || '',
    );

    let room = await this.roomRepo.findOne({
      where: {
        passcode: data.passcode,
      },
    });

    if (!room) {
      room = this.roomRepo.create({
        passcode: data.passcode,
        roomName: `Room-${data.passcode}`,
      });

      room = await this.roomRepo.save(room);
    }

    let user = await this.userRepo.findOne({
      where: {
        nickname: data.nickname,
        roomId: room.id,
      },
    });

    if (!user) {
      user = this.userRepo.create({
        nickname: data.nickname,
        roomId: room.id,
        isOnline: true,
        deviceType: data.deviceType,
        deviceModel: data.deviceModel,
        browser: data.browser,
        os: data.os,
      });
    } else {
      user.isOnline = true;
      user.lastSeen = null;
      user.deviceType = data.deviceType || user.deviceType;
      user.deviceModel = data.deviceModel || user.deviceModel;
      user.browser = data.browser || user.browser;
      user.os = data.os || user.os;
    }

    await this.userRepo.save(user);

    client.join(room.passcode);

    this.users.set(client.id, {
      nickname: data.nickname,
      passcode: room.passcode,
    });

    const messages = await this.messageRepo.find({
      where: {
        roomId: room.id,
      },
      order: {
        createdAt: 'ASC',
      },
      take: 100,
    });

    client.emit('chatHistory', messages);

    const roomUsers = await this.userRepo.find({
      where: {
        roomId: room.id,
      },
      order: {
        nickname: 'ASC',
      },
    });

    this.server.to(room.passcode).emit(
      'usersList',
      roomUsers.map((user) => ({
        id: user.id,
        nickname: user.nickname,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        deviceType: user.deviceType,
        deviceModel: user.deviceModel,
        browser: user.browser,
        os: user.os,
      })),
    );

    this.server.to(room.passcode).emit('userOnline', {
      nickname: data.nickname,
    });

    this.server.to(room.passcode).emit('userJoined', {
      nickname: data.nickname,
    });

    return {
      success: true,
      roomId: room.id,
      passcode: room.passcode,
    };
  }

  @SubscribeMessage('sendMessage')
  async sendMessage(
    @MessageBody()
    data: {
      nickname: string;
      passcode: string;
      message: string;
      replyTo?: {
        id?: number;
        nickname: string;
        message: string;
      };
      fileUrl?: string;
      fileName?: string;
      fileType?: string;
      fileSize?: number;
    },
  ) {
    const room = await this.roomRepo.findOne({
      where: {
        passcode: data.passcode,
      },
    });

    if (!room) {
      return {
        success: false,
        message: 'Room not found',
      };
    }

    const savedMessage = this.messageRepo.create({
      roomId: room.id,
      nickname: data.nickname,
      message: data.message,
      replyTo: data.replyTo,
      fileUrl: data.fileUrl ?? null,
      fileName: data.fileName ?? null,
      fileType: data.fileType ?? null,
      fileSize: data.fileSize ?? null,
    });

    await this.messageRepo.save(savedMessage);

    this.server.to(room.passcode).emit('newMessage', {
      id: savedMessage.id,
      roomId: room.id,
      nickname: savedMessage.nickname,
      message: savedMessage.message,
      createdAt: savedMessage.createdAt,
      replyTo: savedMessage.replyTo,
      fileUrl: savedMessage.fileUrl,
      fileName: savedMessage.fileName,
      fileType: savedMessage.fileType,
      fileSize: savedMessage.fileSize,
    });

    return {
      success: true,
    };
  }

  @SubscribeMessage('getMessages')
  async getMessages(
    @MessageBody()
    data: {
      passcode: string;
    },
  ) {
    const room = await this.roomRepo.findOne({
      where: {
        passcode: data.passcode,
      },
    });

    if (!room) {
      return [];
    }

    return await this.messageRepo.find({
      where: {
        roomId: room.id,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  @SubscribeMessage('typing')
  typing(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      nickname: string;
      passcode: string;
    },
  ) {
    client.to(data.passcode).emit('userTyping', {
      nickname: data.nickname,
    });
  }

  @SubscribeMessage('stopTyping')
  stopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      nickname: string;
      passcode: string;
    },
  ) {
    client.to(data.passcode).emit('userStoppedTyping', {
      nickname: data.nickname,
    });
  }

  @SubscribeMessage('getUsers')
  async getUsers(
    @MessageBody()
    data: {
      passcode: string;
    },
    @ConnectedSocket()
    client: Socket,
  ) {
    const room = await this.roomRepo.findOne({
      where: {
        passcode: data.passcode,
      },
    });

    if (!room) {
      client.emit('usersList', []);
      return;
    }

    const users = await this.userRepo.find({
      where: {
        roomId: room.id,
      },
      order: {
        nickname: 'ASC',
      },
    });

    client.emit(
      'usersList',
      users.map((user) => ({
        id: user.id,
        nickname: user.nickname,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        deviceType: user.deviceType,
        deviceModel: user.deviceModel,
        browser: user.browser,
        os: user.os,
      })),
    );
  }
}
