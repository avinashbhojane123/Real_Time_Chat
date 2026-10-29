import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';

import { Room } from '../rooms/room.entity';

@Unique(['roomId', 'nickname'])
@Index(['roomId', 'nickname'])
@Index(['roomId', 'isOnline'])
@Index(['roomId', 'lastSeen'])
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'varchar',
    length: 50,
  })
  nickname!: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  isOnline!: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  lastSeen!: Date | null;

  @ManyToOne(() => Room, (room) => room.users, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'roomId',
  })
  room!: Room;

  @Column({
    type: 'int',
  })
  roomId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  deviceType!: string | null;

  @Column({
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  deviceModel!: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  browser!: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  os!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  avatarUrl!: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  networkLabel!: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  batteryLabel!: string | null;

  @Column({
    type: 'boolean',
    default: false,
  })
  batteryIsCharging!: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'member',
  })
  role!: 'host' | 'admin' | 'member';

  @Column({
    type: 'boolean',
    default: false,
  })
  isMuted!: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  isBanned!: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  bannedAt!: Date | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  sessionToken!: string | null;

  @Column({
    type: 'boolean',
    default: false,
  })
  isCreator!: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  mutedUntil!: Date | null;
}
