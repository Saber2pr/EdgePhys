/*
 * @Author: AK-12
 * @Date: 2018-10-30 22:46:42
 * @Last Modified by: AK-12
 * @Last Modified time: 2018-11-18 13:42:47
 */
/**
 * 给定点和最大极径，限制点的活动范围
 * @param commitPos
 * @param limitRadius
 */
let limitToCircle = (commitPos: cc.Vec2, limitRadius: number): cc.Vec2 =>
  getLength(commitPos) < limitRadius
    ? commitPos
    : getPos(getAngle(commitPos), limitRadius)
/**
 * 给定点获取其极角(弧度)
 * @param Pos
 */
let getAngle = (Pos: cc.Vec2): number =>
  Pos.y > 0 ? Math.acos(Pos.x / Pos.mag()) : -Math.acos(Pos.x / Pos.mag())
/**
 *给定极角，极径获取点
 *
 * @export
 * @param {*} angle
 * @param {*} radius
 * @returns
 */
let getPos = (angle: number, radius: number): cc.Vec2 =>
  cc.v2(radius * Math.cos(angle), radius * Math.sin(angle))
/**
 *给定点，获取极径
 *
 * @export
 * @param {*} commitPos
 * @returns
 */
let getLength = (commitPos: cc.Vec2): number => commitPos.mag()
/**
 * 弧度转角度
 * @param angle
 */
let radToAngle = (angle: number): number => (angle * 180) / Math.PI
/**
 * convertToSpace
 * @param origin
 * @param pos
 */
let convertToSpace = (origin: cc.Vec2, pos: cc.Vec2) =>
  cc.v2(pos.x - origin.x, pos.y - origin.y)
/**
 * convertToWorldSpaceAR
 * @param node
 */
let toWPos = (node: cc.Node) =>
  node.getParent().convertToWorldSpaceAR(node.position)
/**
 * convertToNodeSpaceAR
 * @param node
 */
export let toLPos = (node: cc.Node, pos: cc.Vec2): cc.Vec2 =>
  node.getParent().convertToNodeSpaceAR(pos)
/**
 *follow
 * @param follower
 * @param target
 */
let follow = (follower: cc.Node, target: cc.Node) => {
  follower.setPosition(toLPos(follower, toWPos(target)))
}
/**
 *MoveCtrllor
 *
 * @export
 * @class MoveCtrllor
 */
class MoveCtrllor {
  private Damping: number = 50
  private angle: number
  private status: boolean
  private LENGTH: number = 500
  private targetBody: cc.RigidBody
  private node: cc.Node
  private isRotate: boolean
  private __ANCHOR__: cc.Vec2
  /**
   * MoveCtrllor
   * @param basicNode
   * @param touchNode
   * @param target
   * @param damp
   */
  constructor(
    basicNode: cc.Node,
    touchNode: cc.Node,
    target: cc.Node,
    damp: number = 50,
    isRotate: boolean = true
  ) {
    this.refresh(touchNode)
    this.node = target
    this.targetBody = target.getComponent(cc.RigidBody)
    this.damping = damp
    this.isRotate = isRotate
    this.__ANCHOR__ = toWPos(basicNode)
    this.addListener(basicNode, touchNode)
    this.targetBody.gravityScale = 0
  }
  /**
   *添加监听
   * @param basicNode
   * @param touchNode
   */
  private addListener(basicNode: cc.Node, touchNode: cc.Node) {
    basicNode.on('touchstart', event => {
      this.status = true
      this.update(basicNode, touchNode, event)
    })
    basicNode.on('touchmove', event => {
      this.update(basicNode, touchNode, event)
    })
    basicNode.on('touchend', () => {
      this.refresh(touchNode)
    })
    basicNode.on('touchcancel', () => {
      this.refresh(touchNode)
    })
  }
  /**
   * 更新touchNode位置
   * @param basicNode
   * @param touchNode
   * @param event
   */
  private update(basicNode: cc.Node, touchNode: cc.Node, event) {
    let localPoint = convertToSpace(this.__ANCHOR__, event.getLocation())
    let touch_limited = limitToCircle(localPoint, basicNode.width / 2)
    touchNode.setPosition(touch_limited)
    this.angle = getAngle(touch_limited)
  }
  /**
   * 重置状态
   * @param touchNode
   */
  private refresh(touchNode: cc.Node) {
    this.angle = 0
    this.status = false
    touchNode.setPosition(0, 0)
  }
  /**
   *speed
   *
   * @memberof MoveCtrllor
   */
  set damping(value: number) {
    this.targetBody.linearDamping = this.LENGTH / value
    this.targetBody.angularDamping = this.LENGTH / value
    this.Damping = value
  }
  get damping(): number {
    return this.Damping
  }
  /**
   *step
   *
   * @param {*} node
   * @memberof MoveCtrllor
   */
  public step(): void {
    if (this.status === true) {
      this.targetBody.applyLinearImpulse(
        getPos(this.angle, this.LENGTH),
        this.targetBody.getWorldCenter(),
        true
      )
      this.isRotate ? this.node.setRotation(-radToAngle(this.angle)) : null
    }
  }
}
const { ccclass, property } = cc._decorator
const OPTIONS = cc.Enum({
  NO: 0,
  YES: 1
})
/**
 *creator接口
 *
 * @export
 * @class MoveBoot
 * @extends {cc.Component}
 */
@ccclass
export default class MoveBoot extends cc.Component {
  @property({
    type: cc.Node,
    displayName: '轮盘拖动点'
  })
  touchSpr: cc.Node = null

  @property({
    type: cc.Node,
    displayName: '角色节点'
  })
  hero: cc.Node = null

  @property({
    type: cc.Integer,
    tooltip: '默认50',
    displayName: '速度',
    slide: true,
    min: 1,
    max: 200,
    step: 1
  })
  damping: number = 50

  @property({
    type: cc.Enum(OPTIONS),
    displayName: '是否旋转',
    tooltip: '以x轴正向为0'
  })
  isRotate = OPTIONS.YES

  @property({
    type: cc.Enum(OPTIONS),
    displayName: '是否开启摄像机跟随'
  })
  cameraActive = OPTIONS.NO

  moveCtrllor: MoveCtrllor

  camera: cc.Node

  onLoad() {
    cc.director.getPhysicsManager().enabled = true
    this.moveCtrllor = new MoveCtrllor(
      this.node,
      this.touchSpr,
      this.hero,
      this.damping,
      Boolean(this.isRotate)
    )
    this.camera = cc.Canvas.instance.node.getComponentInChildren(cc.Camera).node
  }
  update() {
    this.moveCtrllor.step()
    this.cameraActive ? follow(this.camera, this.hero) : null
  }
}
