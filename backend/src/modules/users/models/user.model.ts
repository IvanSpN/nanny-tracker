import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  Default,
  DeletedAt,
  Model,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from 'sequelize-typescript';

export enum UserRole {
  WORKER = 'worker',
  CLIENT = 'client',
}

@Table({
  tableName: 'users',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export class User extends Model<User> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.UUID,
  })
  declare id: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
  })
  declare name: string;

  @Unique
  @AllowNull(false)
  @Column({
    type: DataType.STRING,
  })
  declare email: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
    field: 'password_hash',
  })
  declare passwordHash: string;

  @AllowNull(false)
  @Column({
    type: DataType.ENUM(...Object.values(UserRole)),
  })
  declare role: UserRole;

  @CreatedAt
  @Column({
    field: 'created_at',
  })
  declare createdAt: Date;

  @UpdatedAt
  @Column({
    field: 'updated_at',
  })
  declare updatedAt: Date;

  @DeletedAt
  @Column({
    field: 'deleted_at',
  })
  declare deletedAt?: Date;
}
