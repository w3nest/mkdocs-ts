/* eslint-disable */
import type * as THREE from 'three'

export function CSS3DModule(three: THREE) {
    const _position = new three.Vector3()
    const _quaternion = new three.Quaternion()
    const _scale = new three.Vector3()

    class CSS3DObject extends three.Object3D {
        public readonly isCSS3DObject = true
        public element: HTMLElement

        constructor(element: HTMLElement) {
            super()

            this.isCSS3DObject = true

            this.element = document.createElement('div')
            this.element.appendChild(element)
            this.element.style.position = 'absolute'
            this.element.style.pointerEvents = 'auto'
            this.element.style.userSelect = 'none'
            this.element.classList.add('css-3d-object')
            this.element.setAttribute('draggable', 'false')

            this['addEventListener']('removed', function () {
                this.traverse(function (object) {
                    if (
                        object.element instanceof Element &&
                        object.element.parentNode !== null
                    ) {
                        object.element.parentNode.removeChild(object.element)
                    }
                })
            })
        }

        copy(source, recursive) {
            super.copy(source, recursive)

            this.element = source.element.cloneNode(true)

            return this
        }
    }

    class CSS3DSprite extends CSS3DObject {
        isCSS3DSprite = true
        rotation2D = 0
        constructor(element) {
            super(element)

            this.isCSS3DSprite = true

            this.rotation2D = 0
        }

        copy(source, recursive) {
            super.copy(source, recursive)

            this.rotation2D = source.rotation2D

            return this
        }
    }

    //

    const _matrix = new three.Matrix4()
    const _matrix2 = new three.Matrix4()

    class CSS3DRenderer {
        public domElement: HTMLElement
        public viewElement: HTMLElement
        public cameraElement: HTMLElement

        public cache
        public _width
        public _height
        public _widthHalf
        public _heightHalf

        getSize() {
            return {
                width: this._width,
                height: this._height,
            }
        }
        setSize(width, height) {
            this._width = width
            this._height = height
            this._widthHalf = this._width / 2
            this._heightHalf = this._height / 2

            this.domElement.style.width = width + 'px'
            this.domElement.style.height = height + 'px'

            this.viewElement.style.width = width + 'px'
            this.viewElement.style.height = height + 'px'

            this.cameraElement.style.width = width + 'px'
            this.cameraElement.style.height = height + 'px'
        }
        constructor(parameters: { element? } = {}) {
            let _width, _height
            let _widthHalf, _heightHalf

            this.cache = {
                camera: { fov: 0, style: '' },
                objects: new WeakMap(),
            }

            const domElement =
                parameters.element !== undefined
                    ? parameters.element
                    : document.createElement('div')

            domElement.style.overflow = 'hidden'

            this.domElement = domElement

            this.viewElement = document.createElement('div')
            this.viewElement.style.transformOrigin = '0 0'
            this.viewElement.style.pointerEvents = 'none'
            domElement.appendChild(this.viewElement)

            this.cameraElement = document.createElement('div')

            this.cameraElement.style.transformStyle = 'preserve-3d'

            this.viewElement.appendChild(this.cameraElement)
        }

        render(scene, camera) {
            const fov = camera.projectionMatrix.elements[5] * this._heightHalf

            if (this.cache.camera.fov !== fov) {
                this.viewElement.style.perspective = camera.isPerspectiveCamera
                    ? fov + 'px'
                    : ''
                this.cache.camera.fov = fov
            }

            if (camera.view && camera.view.enabled) {
                // view offset
                this.viewElement.style.transform = `translate( ${
                    -camera.view.offsetX * (this._width / camera.view.width)
                }px, ${
                    -camera.view.offsetY * (this._height / camera.view.height)
                }px )`

                // view fullWidth and fullHeight, view width and height
                this.viewElement.style.transform += `scale( ${
                    camera.view.fullWidth / camera.view.width
                }, ${camera.view.fullHeight / camera.view.height} )`
            } else {
                this.viewElement.style.transform = ''
            }

            if (scene.matrixWorldAutoUpdate === true) {
                scene.updateMatrixWorld()
            }
            if (
                camera.parent === null &&
                camera.matrixWorldAutoUpdate === true
            ) {
                camera.updateMatrixWorld()
            }

            let tx, ty

            if (camera.isOrthographicCamera) {
                tx = -(camera.right + camera.left) / 2
                ty = (camera.top + camera.bottom) / 2
            }

            const scaleByViewOffset =
                camera.view && camera.view.enabled
                    ? camera.view.height / camera.view.fullHeight
                    : 1
            const cameraCSSMatrix = camera.isOrthographicCamera
                ? `scale( ${scaleByViewOffset} )` +
                  'scale(' +
                  fov +
                  ')' +
                  'translate(' +
                  this.epsilon(tx) +
                  'px,' +
                  this.epsilon(ty) +
                  'px)' +
                  this.getCameraCSSMatrix(camera.matrixWorldInverse)
                : `scale( ${scaleByViewOffset} )` +
                  'translateZ(' +
                  fov +
                  'px)' +
                  this.getCameraCSSMatrix(camera.matrixWorldInverse)

            const style =
                cameraCSSMatrix +
                'translate(' +
                this._widthHalf +
                'px,' +
                this._heightHalf +
                'px)'

            if (this.cache.camera.style !== style) {
                this.cameraElement.style.transform = style

                this.cache.camera.style = style
            }

            this.renderObject(scene, scene, camera, cameraCSSMatrix)
        }

        epsilon(value) {
            return Math.abs(value) < 1e-10 ? 0 : value
        }

        getCameraCSSMatrix(matrix) {
            const elements = matrix.elements

            return (
                'matrix3d(' +
                this.epsilon(elements[0]) +
                ',' +
                this.epsilon(-elements[1]) +
                ',' +
                this.epsilon(elements[2]) +
                ',' +
                this.epsilon(elements[3]) +
                ',' +
                this.epsilon(elements[4]) +
                ',' +
                this.epsilon(-elements[5]) +
                ',' +
                this.epsilon(elements[6]) +
                ',' +
                this.epsilon(elements[7]) +
                ',' +
                this.epsilon(elements[8]) +
                ',' +
                this.epsilon(-elements[9]) +
                ',' +
                this.epsilon(elements[10]) +
                ',' +
                this.epsilon(elements[11]) +
                ',' +
                this.epsilon(elements[12]) +
                ',' +
                this.epsilon(-elements[13]) +
                ',' +
                this.epsilon(elements[14]) +
                ',' +
                this.epsilon(elements[15]) +
                ')'
            )
        }

        getObjectCSSMatrix(matrix) {
            const elements = matrix.elements
            const matrix3d =
                'matrix3d(' +
                this.epsilon(elements[0]) +
                ',' +
                this.epsilon(elements[1]) +
                ',' +
                this.epsilon(elements[2]) +
                ',' +
                this.epsilon(elements[3]) +
                ',' +
                this.epsilon(-elements[4]) +
                ',' +
                this.epsilon(-elements[5]) +
                ',' +
                this.epsilon(-elements[6]) +
                ',' +
                this.epsilon(-elements[7]) +
                ',' +
                this.epsilon(elements[8]) +
                ',' +
                this.epsilon(elements[9]) +
                ',' +
                this.epsilon(elements[10]) +
                ',' +
                this.epsilon(elements[11]) +
                ',' +
                this.epsilon(elements[12]) +
                ',' +
                this.epsilon(elements[13]) +
                ',' +
                this.epsilon(elements[14]) +
                ',' +
                this.epsilon(elements[15]) +
                ')'

            return 'translate(-50%,-50%)' + matrix3d
        }

        renderObject(object, scene, camera, cameraCSSMatrix) {
            if (object.isCSS3DObject) {
                const visible =
                    object.visible === true &&
                    object.layers.test(camera.layers) === true
                object.element.style.display = visible === true ? '' : 'none'

                if (visible === true) {
                    object.onBeforeRender(this, scene, camera)

                    let style

                    if (object.isCSS3DSprite) {
                        // http://swiftcoder.wordpress.com/2008/11/25/constructing-a-billboard-matrix/

                        _matrix.copy(camera.matrixWorldInverse)
                        _matrix.transpose()

                        if (object.rotation2D !== 0) {
                            _matrix.multiply(
                                _matrix2.makeRotationZ(object.rotation2D),
                            )
                        }

                        object.matrixWorld.decompose(
                            _position,
                            _quaternion,
                            _scale,
                        )
                        _matrix.setPosition(_position)
                        _matrix.scale(_scale)

                        _matrix.elements[3] = 0
                        _matrix.elements[7] = 0
                        _matrix.elements[11] = 0
                        _matrix.elements[15] = 1

                        style = this.getObjectCSSMatrix(_matrix)
                    } else {
                        style = this.getObjectCSSMatrix(object.matrixWorld)
                    }

                    const element = object.element
                    const cachedObject = this.cache.objects.get(object)

                    if (
                        cachedObject === undefined ||
                        cachedObject.style !== style
                    ) {
                        element.style.transform = style

                        const objectData = { style: style }
                        this.cache.objects.set(object, objectData)
                    }

                    if (element.parentNode !== this.cameraElement) {
                        this.cameraElement.appendChild(element)
                    }

                    object.onAfterRender(this, scene, camera)
                }
            }

            for (let i = 0, l = object.children.length; i < l; i++) {
                this.renderObject(
                    object.children[i],
                    scene,
                    camera,
                    cameraCSSMatrix,
                )
            }
        }
    }
    return { CSS3DObject, CSS3DSprite, CSS3DRenderer }
}
/**
 * Based on http://www.emagix.net/academic/mscs-project/item/camera-sync-with-css3-and-webgl-threejs
 */
//
// const _position = new Vector3()
// const _quaternion = new Quaternion()
// const _scale = new Vector3()
//
// class CSS3DObject extends Object3D {
//     public readonly isCSS3DObject = true
//     public element: HTMLElement
//
//     constructor(element: HTMLElement) {
//         super()
//
//         this.isCSS3DObject = true
//
//         this.element = document.createElement('div')
//         this.element.appendChild(element)
//         this.element.style.position = 'absolute'
//         this.element.style.pointerEvents = 'auto'
//         this.element.style.userSelect = 'none'
//         this.element.classList.add('css-3d-object')
//         this.element.setAttribute('draggable', 'false')
//
//         this['addEventListener']('removed', function () {
//             this.traverse(function (object) {
//                 if (
//                     object.element instanceof Element &&
//                     object.element.parentNode !== null
//                 ) {
//                     object.element.parentNode.removeChild(object.element)
//                 }
//             })
//         })
//     }
//
//     copy(source, recursive) {
//         super.copy(source, recursive)
//
//         this.element = source.element.cloneNode(true)
//
//         return this
//     }
// }
//
// class CSS3DSprite extends CSS3DObject {
//     isCSS3DSprite = true
//     rotation2D = 0
//     constructor(element) {
//         super(element)
//
//         this.isCSS3DSprite = true
//
//         this.rotation2D = 0
//     }
//
//     copy(source, recursive) {
//         super.copy(source, recursive)
//
//         this.rotation2D = source.rotation2D
//
//         return this
//     }
// }
//
// //
//
// const _matrix = new Matrix4()
// const _matrix2 = new Matrix4()
//
// class CSS3DRenderer {
//     public domElement: HTMLElement
//     public viewElement: HTMLElement
//     public cameraElement: HTMLElement
//
//     public cache
//     public _width
//     public _height
//     public _widthHalf
//     public _heightHalf
//
//     getSize() {
//         return {
//             width: this._width,
//             height: this._height,
//         }
//     }
//     setSize(width, height) {
//         this._width = width
//         this._height = height
//         this._widthHalf = this._width / 2
//         this._heightHalf = this._height / 2
//
//         this.domElement.style.width = width + 'px'
//         this.domElement.style.height = height + 'px'
//
//         this.viewElement.style.width = width + 'px'
//         this.viewElement.style.height = height + 'px'
//
//         this.cameraElement.style.width = width + 'px'
//         this.cameraElement.style.height = height + 'px'
//     }
//     constructor(parameters: { element? } = {}) {
//         let _width, _height
//         let _widthHalf, _heightHalf
//
//         this.cache = {
//             camera: { fov: 0, style: '' },
//             objects: new WeakMap(),
//         }
//
//         const domElement =
//             parameters.element !== undefined
//                 ? parameters.element
//                 : document.createElement('div')
//
//         domElement.style.overflow = 'hidden'
//
//         this.domElement = domElement
//
//         this.viewElement = document.createElement('div')
//         this.viewElement.style.transformOrigin = '0 0'
//         this.viewElement.style.pointerEvents = 'none'
//         domElement.appendChild(this.viewElement)
//
//         this.cameraElement = document.createElement('div')
//
//         this.cameraElement.style.transformStyle = 'preserve-3d'
//
//         this.viewElement.appendChild(this.cameraElement)
//     }
//
//     render(scene, camera) {
//         const fov = camera.projectionMatrix.elements[5] * this._heightHalf
//
//         if (this.cache.camera.fov !== fov) {
//             this.viewElement.style.perspective = camera.isPerspectiveCamera
//                 ? fov + 'px'
//                 : ''
//             this.cache.camera.fov = fov
//         }
//
//         if (camera.view && camera.view.enabled) {
//             // view offset
//             this.viewElement.style.transform = `translate( ${
//                 -camera.view.offsetX * (this._width / camera.view.width)
//             }px, ${
//                 -camera.view.offsetY * (this._height / camera.view.height)
//             }px )`
//
//             // view fullWidth and fullHeight, view width and height
//             this.viewElement.style.transform += `scale( ${
//                 camera.view.fullWidth / camera.view.width
//             }, ${camera.view.fullHeight / camera.view.height} )`
//         } else {
//             this.viewElement.style.transform = ''
//         }
//
//         if (scene.matrixWorldAutoUpdate === true) {
//             scene.updateMatrixWorld()
//         }
//         if (camera.parent === null && camera.matrixWorldAutoUpdate === true) {
//             camera.updateMatrixWorld()
//         }
//
//         let tx, ty
//
//         if (camera.isOrthographicCamera) {
//             tx = -(camera.right + camera.left) / 2
//             ty = (camera.top + camera.bottom) / 2
//         }
//
//         const scaleByViewOffset =
//             camera.view && camera.view.enabled
//                 ? camera.view.height / camera.view.fullHeight
//                 : 1
//         const cameraCSSMatrix = camera.isOrthographicCamera
//             ? `scale( ${scaleByViewOffset} )` +
//               'scale(' +
//               fov +
//               ')' +
//               'translate(' +
//               this.epsilon(tx) +
//               'px,' +
//               this.epsilon(ty) +
//               'px)' +
//               this.getCameraCSSMatrix(camera.matrixWorldInverse)
//             : `scale( ${scaleByViewOffset} )` +
//               'translateZ(' +
//               fov +
//               'px)' +
//               this.getCameraCSSMatrix(camera.matrixWorldInverse)
//
//         const style =
//             cameraCSSMatrix +
//             'translate(' +
//             this._widthHalf +
//             'px,' +
//             this._heightHalf +
//             'px)'
//
//         if (this.cache.camera.style !== style) {
//             this.cameraElement.style.transform = style
//
//             this.cache.camera.style = style
//         }
//
//         this.renderObject(scene, scene, camera, cameraCSSMatrix)
//     }
//
//     epsilon(value) {
//         return Math.abs(value) < 1e-10 ? 0 : value
//     }
//
//     getCameraCSSMatrix(matrix) {
//         const elements = matrix.elements
//
//         return (
//             'matrix3d(' +
//             this.epsilon(elements[0]) +
//             ',' +
//             this.epsilon(-elements[1]) +
//             ',' +
//             this.epsilon(elements[2]) +
//             ',' +
//             this.epsilon(elements[3]) +
//             ',' +
//             this.epsilon(elements[4]) +
//             ',' +
//             this.epsilon(-elements[5]) +
//             ',' +
//             this.epsilon(elements[6]) +
//             ',' +
//             this.epsilon(elements[7]) +
//             ',' +
//             this.epsilon(elements[8]) +
//             ',' +
//             this.epsilon(-elements[9]) +
//             ',' +
//             this.epsilon(elements[10]) +
//             ',' +
//             this.epsilon(elements[11]) +
//             ',' +
//             this.epsilon(elements[12]) +
//             ',' +
//             this.epsilon(-elements[13]) +
//             ',' +
//             this.epsilon(elements[14]) +
//             ',' +
//             this.epsilon(elements[15]) +
//             ')'
//         )
//     }
//
//     getObjectCSSMatrix(matrix) {
//         const elements = matrix.elements
//         const matrix3d =
//             'matrix3d(' +
//             this.epsilon(elements[0]) +
//             ',' +
//             this.epsilon(elements[1]) +
//             ',' +
//             this.epsilon(elements[2]) +
//             ',' +
//             this.epsilon(elements[3]) +
//             ',' +
//             this.epsilon(-elements[4]) +
//             ',' +
//             this.epsilon(-elements[5]) +
//             ',' +
//             this.epsilon(-elements[6]) +
//             ',' +
//             this.epsilon(-elements[7]) +
//             ',' +
//             this.epsilon(elements[8]) +
//             ',' +
//             this.epsilon(elements[9]) +
//             ',' +
//             this.epsilon(elements[10]) +
//             ',' +
//             this.epsilon(elements[11]) +
//             ',' +
//             this.epsilon(elements[12]) +
//             ',' +
//             this.epsilon(elements[13]) +
//             ',' +
//             this.epsilon(elements[14]) +
//             ',' +
//             this.epsilon(elements[15]) +
//             ')'
//
//         return 'translate(-50%,-50%)' + matrix3d
//     }
//
//     renderObject(object, scene, camera, cameraCSSMatrix) {
//         if (object.isCSS3DObject) {
//             const visible =
//                 object.visible === true &&
//                 object.layers.test(camera.layers) === true
//             object.element.style.display = visible === true ? '' : 'none'
//
//             if (visible === true) {
//                 object.onBeforeRender(this, scene, camera)
//
//                 let style
//
//                 if (object.isCSS3DSprite) {
//                     // http://swiftcoder.wordpress.com/2008/11/25/constructing-a-billboard-matrix/
//
//                     _matrix.copy(camera.matrixWorldInverse)
//                     _matrix.transpose()
//
//                     if (object.rotation2D !== 0) {
//                         _matrix.multiply(
//                             _matrix2.makeRotationZ(object.rotation2D),
//                         )
//                     }
//
//                     object.matrixWorld.decompose(_position, _quaternion, _scale)
//                     _matrix.setPosition(_position)
//                     _matrix.scale(_scale)
//
//                     _matrix.elements[3] = 0
//                     _matrix.elements[7] = 0
//                     _matrix.elements[11] = 0
//                     _matrix.elements[15] = 1
//
//                     style = this.getObjectCSSMatrix(_matrix)
//                 } else {
//                     style = this.getObjectCSSMatrix(object.matrixWorld)
//                 }
//
//                 const element = object.element
//                 const cachedObject = this.cache.objects.get(object)
//
//                 if (
//                     cachedObject === undefined ||
//                     cachedObject.style !== style
//                 ) {
//                     element.style.transform = style
//
//                     const objectData = { style: style }
//                     this.cache.objects.set(object, objectData)
//                 }
//
//                 if (element.parentNode !== this.cameraElement) {
//                     this.cameraElement.appendChild(element)
//                 }
//
//                 object.onAfterRender(this, scene, camera)
//             }
//         }
//
//         for (let i = 0, l = object.children.length; i < l; i++) {
//             this.renderObject(
//                 object.children[i],
//                 scene,
//                 camera,
//                 cameraCSSMatrix,
//             )
//         }
//     }
// }
//
// export { CSS3DObject, CSS3DSprite, CSS3DRenderer }
