pipeline {
    agent {
        kubernetes {
            cloud 'kubernetes'
            inheritFrom 'buildkit-agent'
        }
    }

    environment {
        APP_NAME = "funch-frontend"
        NAMESPACE = "funch-backend"
        IMAGE_NAME = "ghcr.io/louiskub/funch-frontend"
        CREDENTIAL_ID = "github-pat"
    }

    // parameters {
    //     string(name: 'NEXT_PUBLIC_API_BASE_URL', defaultValue: '', description: 'Public API URL including /api, for example https://api.example.com/api')
    // }

    options {
        disableConcurrentBuilds()
    }

    stages {
        stage('Test') {
            steps {
                container('node') {
                    sh 'npm ci'
                    sh 'npm run lint'
                    sh 'npm run typecheck'
                    sh 'npm test'
                }
            }
        }

        stage('Build Image') {
            steps {
                container('buildctl') {
                    withCredentials([
                        usernamePassword(credentialsId: "${CREDENTIAL_ID}",
                        usernameVariable: 'REG_USER',
                        passwordVariable: 'REG_PASS')
                    ]) {
                        sh 'test -n "$NEXT_PUBLIC_API_BASE_URL"'
                        sh """
                        mkdir -p ~/.docker
                        AUTH=\$(echo -n "\${REG_USER}:\${REG_PASS}" | base64 | tr -d '\\n')
                        echo "{\\"auths\\":{\\"ghcr.io\\":{\\"auth\\":\\"\$AUTH\\"}}}" > ~/.docker/config.json
                        """
                        sh """
                        buildctl build --frontend dockerfile.v0 \\
                        --local context=. \\
                        --local dockerfile=. \\
                        --opt build-arg:NEXT_PUBLIC_API_BASE_URL=\$NEXT_PUBLIC_API_BASE_URL \\
                        --output type=image,\\"name=\${IMAGE_NAME},\${IMAGE_NAME}:1.0.\${BUILD_NUMBER}\\",push=true
                        """
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                container('kubectl') {
                    withCredentials([
                        usernamePassword(credentialsId: "${CREDENTIAL_ID}",
                        usernameVariable: 'REG_USER',
                        passwordVariable: 'REG_PASS')
                    ]) {
                        sh "kubectl create ns ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -"
                        sh """
                        kubectl create secret docker-registry regcred \\
                            --namespace=${NAMESPACE} \\
                            --docker-server=ghcr.io \\
                            --docker-username=\${REG_USER} \\
                            --docker-password=\${REG_PASS} \\
                            --dry-run=client -o yaml | kubectl apply -f -
                        """
                        sh 'kubectl apply -f app-deploy.yml'
                        sh "kubectl set image deployment/${APP_NAME} -n ${NAMESPACE} ${APP_NAME}=${IMAGE_NAME}:1.0.${BUILD_NUMBER}"
                        sh "kubectl rollout status deployment/${APP_NAME} -n ${NAMESPACE} --timeout=5m"
                    }
                }
            }
        }
    }
}
