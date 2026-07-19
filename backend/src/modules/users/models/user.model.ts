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
  ADMIN = 'admin',
}

@Table({
  tableName: 'users',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export class User extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.UUID,
  })
  declare id: string;

  @Unique
  @AllowNull(false)
  @Column({
    type: DataType.STRING,
  })
  declare login: string;

  @Unique
  @AllowNull(true)
  @Column({
    type: DataType.STRING,
  })
  declare email: string | null;

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

  @AllowNull(false)
  @Default(true)
  @Column({
    type: DataType.BOOLEAN,
    field: 'is_initial_password_changed',
  })
  declare isInitialPasswordChanged: boolean;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    field: 'created_at',
  })
  declare createdAt: Date;

  @UpdatedAt
  @Column({
    type: DataType.DATE,
    field: 'updated_at',
  })
  declare updatedAt: Date;

  @DeletedAt
  @Column({
    type: DataType.DATE,
    field: 'deleted_at',
  })
  declare deletedAt: Date | null;
}

export default User;
